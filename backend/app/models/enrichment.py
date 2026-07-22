"""جاب‌های غنی‌سازی خودکار محصول (اسکرپ تصویر + توضیح)."""

from __future__ import annotations

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ProductEnrichmentJob(Base):
    __tablename__ = "product_enrichment_jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"), nullable=False
    )
    design_code: Mapped[str | None] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(String(24), default="pending", nullable=False)
    query_used: Mapped[str | None] = mapped_column(String(512))
    description_draft: Mapped[str | None] = mapped_column(Text)
    meta_draft: Mapped[str | None] = mapped_column(Text)
    error: Mapped[str | None] = mapped_column(Text)
    attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    auto_apply: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[object] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    finished_at: Mapped[object | None] = mapped_column(DateTime(timezone=True))

    product: Mapped["Product"] = relationship()  # noqa: F821
    candidates: Mapped[list["ProductEnrichmentCandidate"]] = relationship(
        back_populates="job",
        cascade="all, delete-orphan",
        order_by="ProductEnrichmentCandidate.score.desc()",
    )

    __table_args__ = (
        CheckConstraint(
            "status IN ('pending','running','needs_review','approved','rejected','failed')",
            name="ck_enrichment_jobs_status",
        ),
        Index("idx_enrichment_jobs_status", "status"),
        Index("idx_enrichment_jobs_product", "product_id"),
    )


class ProductEnrichmentCandidate(Base):
    __tablename__ = "product_enrichment_candidates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    job_id: Mapped[int] = mapped_column(
        ForeignKey("product_enrichment_jobs.id", ondelete="CASCADE"), nullable=False
    )
    image_url: Mapped[str] = mapped_column(String(1024), nullable=False)
    source: Mapped[str | None] = mapped_column(String(64))
    score: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    local_storage_key: Mapped[str | None] = mapped_column(String(512))
    mime_type: Mapped[str | None] = mapped_column(String(64))
    is_selected: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())

    job: Mapped["ProductEnrichmentJob"] = relationship(back_populates="candidates")

    __table_args__ = (Index("idx_enrichment_candidates_job", "job_id"),)
