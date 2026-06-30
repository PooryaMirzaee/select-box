from __future__ import annotations

import sys
from pathlib import Path

import typer
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from avan_publisher import __version__
from avan_publisher.api.client import CoralayAPIError, CoralayClient
from avan_publisher.config import get_settings
from avan_publisher.core.pipeline import PublishPipeline
from avan_publisher.core.store import init_db, list_publish_records
from avan_publisher.core.sync import sync_products_to_cache

app = typer.Typer(
    name="avan-publisher",
    help="اپلیکیشن لوکال انتشار محصولات CORALAY در کانال‌های فروش",
    no_args_is_help=True,
)
products_app = typer.Typer(help="مدیریت و مشاهدهٔ محصولات")
channels_app = typer.Typer(help="کانال‌های انتشار")
app.add_typer(products_app, name="products")
app.add_typer(channels_app, name="channels")

console = Console()


def _ensure_env() -> None:
    env_path = Path.cwd() / ".env"
    if env_path.is_file():
        return
    pkg_env = Path(__file__).resolve().parent.parent / ".env"
    if pkg_env.is_file():
        return
    console.print("[yellow]Tip:[/] Copy .env.example to .env and configure API credentials")


@app.callback()
def main() -> None:
    """Avan Publisher CLI."""
    _ensure_env()
    init_db()


@app.command()
def version() -> None:
    """Show version."""
    console.print(f"avan-publisher v{__version__}")


@app.command()
def health() -> None:
    """Check API connectivity."""
    settings = get_settings()
    try:
        with CoralayClient() as client:
            result = client.health()
        console.print(f"[green]✓[/] API reachable at {settings.api_base_url}")
        console.print(f"  status: {result.get('status', 'ok')}")
    except Exception as exc:
        console.print(f"[red]✗[/] Cannot reach API at {settings.api_base_url}")
        console.print(f"  {exc}")
        raise typer.Exit(1) from exc


@app.command()
def login(
    phone: str | None = typer.Option(None, help="Admin phone number"),
    password: str | None = typer.Option(None, help="Admin password", hide_input=True),
) -> None:
    """Authenticate with CORALAY admin API and save token locally."""
    settings = get_settings()
    phone = phone or settings.admin_phone
    password = password or settings.admin_password
    if not password:
        password = typer.prompt("Password", hide_input=True)
    if not phone or not password:
        console.print("[red]Provide ADMIN_PHONE and ADMIN_PASSWORD in .env or as options[/]")
        raise typer.Exit(1)

    try:
        with CoralayClient() as client:
            token = client.admin_login(phone, password)
            client.save_token(token)
        console.print(f"[green]✓[/] Logged in as {token.phone} ({token.role})")
        console.print(f"  Token saved to {settings.token_path}")
    except CoralayAPIError as exc:
        console.print(f"[red]Login failed:[/] {exc}")
        raise typer.Exit(1) from exc


@products_app.command("list")
def products_list(
    status: str | None = typer.Option(None, help="Filter: draft | published"),
    admin: bool = typer.Option(True, help="Use admin API (all products)"),
    limit: int = typer.Option(50, help="Max products to show"),
) -> None:
    """List products from CORALAY."""
    try:
        with CoralayClient() as client:
            if admin:
                items = client.list_products_admin()
            else:
                items = client.list_products_public(limit=limit)
    except CoralayAPIError as exc:
        console.print(f"[red]Error:[/] {exc}")
        raise typer.Exit(1) from exc

    if status:
        items = [p for p in items if p.status == status]
    items = items[:limit]

    table = Table(title=f"Products ({len(items)})")
    table.add_column("ID", style="cyan")
    table.add_column("Slug")
    table.add_column("Title")
    table.add_column("Price")
    table.add_column("Status")

    for p in items:
        status_style = "green" if p.status == "published" else "yellow"
        table.add_row(
            str(p.id),
            p.slug,
            p.title[:40],
            p.base_price,
            f"[{status_style}]{p.status}[/{status_style}]",
        )
    console.print(table)


@products_app.command("show")
def products_show(ref: str = typer.Argument(..., help="Product ID or slug")) -> None:
    """Show product details."""
    try:
        with CoralayClient() as client:
            product = client.resolve_product(ref)
    except CoralayAPIError as exc:
        console.print(f"[red]Error:[/] {exc}")
        raise typer.Exit(1) from exc

    url = CoralayClient().product_store_url(product.slug)
    console.print(Panel(f"[bold]{product.title}[/]\n{url}", title=f"Product #{product.id}"))
    console.print(f"Status: {product.status} | Price: {product.effective_price} Toman")
    console.print(f"Variations: {len(product.variations)} | Images: {len(product.image_urls)}")
    if product.description:
        console.print(f"\n{product.description[:300]}...")


@products_app.command("sync")
def products_sync() -> None:
    """Sync product list to local cache."""
    try:
        with CoralayClient() as client:
            count = sync_products_to_cache(client)
        console.print(f"[green]✓[/] Synced {count} products to local cache")
    except CoralayAPIError as exc:
        console.print(f"[red]Error:[/] {exc}")
        raise typer.Exit(1) from exc


@channels_app.command("list")
def channels_list() -> None:
    """List registered publish channels."""
    pipeline = PublishPipeline()
    items = pipeline.list_available_channels()

    table = Table(title="Publish Channels")
    table.add_column("ID", style="cyan")
    table.add_column("Name")
    table.add_column("Enabled")
    table.add_column("Configured")
    table.add_column("Description")

    for ch in items:
        enabled = "[green]yes[/]" if ch["enabled"] else "[dim]no[/]"
        configured = "[green]yes[/]" if ch["configured"] else "[yellow]no[/]"
        table.add_row(ch["id"], ch["name"], enabled, configured, ch["description"][:50])
    console.print(table)


@app.command()
def publish(
    product: list[str] = typer.Option(
        ...,
        "--product",
        "-p",
        help="Product ID or slug (repeatable)",
    ),
    channels: str = typer.Option(
        ...,
        "--channels",
        "-c",
        help="Comma-separated channel IDs (e.g. instagram,telegram)",
    ),
    dry_run: bool = typer.Option(False, "--dry-run", help="Simulate without side effects"),
) -> None:
    """Publish product(s) to selected channels."""
    channel_ids = [c.strip() for c in channels.split(",") if c.strip()]
    if not channel_ids:
        console.print("[red]Specify at least one channel with --channels[/]")
        raise typer.Exit(1)

    pipeline = PublishPipeline()
    try:
        runs = pipeline.publish_batch(product, channel_ids, dry_run=dry_run)
    except (ValueError, CoralayAPIError) as exc:
        console.print(f"[red]Error:[/] {exc}")
        raise typer.Exit(1) from exc

    for run in runs:
        console.print(Panel(f"[bold]{run.product.title}[/] (#{run.product.id})", title=f"Run {run.run_id}"))
        for result in run.results:
            color = {"success": "green", "failed": "red", "skipped": "yellow", "pending": "blue"}.get(
                result.status.value, "white"
            )
            console.print(f"  [{color}]● {result.channel_id}[/]: {result.message}")
            if result.external_url:
                console.print(f"    → {result.external_url}")


@app.command()
def status(
    limit: int = typer.Option(20, help="Number of recent records"),
) -> None:
    """Show recent publish history."""
    records = list_publish_records(limit=limit)
    if not records:
        console.print("No publish records yet.")
        return

    table = Table(title="Publish History")
    table.add_column("Time")
    table.add_column("Product")
    table.add_column("Channel")
    table.add_column("Status")
    table.add_column("Message")

    for r in records:
        table.add_row(
            r.created_at.strftime("%Y-%m-%d %H:%M"),
            r.product_slug[:30],
            r.channel_id,
            r.status,
            r.message[:40],
        )
    console.print(table)


@app.command()
def serve(
    host: str = typer.Option("127.0.0.1", help="Bind host"),
    port: int = typer.Option(8765, help="Bind port"),
    open_browser: bool = typer.Option(True, "--open/--no-open", help="Open browser on start"),
) -> None:
    """Start local web UI."""
    import webbrowser

    import uvicorn

    from avan_publisher.web.app import create_app

    url = f"http://{host}:{port}"
    if open_browser:
        webbrowser.open(url)
    console.print(f"[green]Avan Publisher UI[/] → {url}")
    uvicorn.run(create_app(), host=host, port=port, log_level="info")


if __name__ == "__main__":
    app()
