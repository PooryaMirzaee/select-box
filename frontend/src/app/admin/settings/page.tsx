"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import {
  adminFetch,
  type ShopSettingsAdmin,
  type SmsTemplate,
  type SmsTestResult,
} from "@/lib/api";

export default function AdminSettingsPage() {
  const [form, setForm] = useState<ShopSettingsAdmin | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [testPhone, setTestPhone] = useState("");
  const [testTemplateId, setTestTemplateId] = useState("otp_login");
  const [testing, setTesting] = useState(false);

  const token = () => localStorage.getItem("selectbox_admin_token")!;

  useEffect(() => {
    adminFetch<ShopSettingsAdmin>("/api/v1/admin/settings", token()).then(setForm).catch(() => {});
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setMsg(null);
    try {
      const updated = await adminFetch<ShopSettingsAdmin>("/api/v1/admin/settings", token(), {
        method: "PATCH",
        body: JSON.stringify(form),
      });
      setForm(updated);
      setMsg("ذخیره شد");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "خطا");
    } finally {
      setSaving(false);
    }
  }

  async function testSms() {
    if (!testPhone.trim()) {
      setMsg("شماره موبایل برای تست وارد کنید");
      return;
    }
    setTesting(true);
    setMsg(null);
    try {
      const res = await adminFetch<SmsTestResult>("/api/v1/admin/settings/sms/test", token(), {
        method: "POST",
        body: JSON.stringify({ phone: testPhone.trim(), template_id: testTemplateId }),
      });
      setMsg(res.ok ? `تست موفق: ${res.detail}` : `تست ناموفق: ${res.detail}`);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "خطا در تست پیامک");
    } finally {
      setTesting(false);
    }
  }

  function updateTemplate(index: number, patch: Partial<SmsTemplate>) {
    if (!form) return;
    const next = [...form.sms_templates];
    next[index] = { ...next[index], ...patch };
    setForm({ ...form, sms_templates: next });
  }

  function updateTemplateParam(tIndex: number, pIndex: number, patch: { name?: string; label_fa?: string }) {
    if (!form) return;
    const tpl = form.sms_templates[tIndex];
    const params = [...tpl.parameters];
    params[pIndex] = { ...params[pIndex], ...patch };
    updateTemplate(tIndex, { parameters: params });
  }

  function addTemplateParam(tIndex: number) {
    if (!form) return;
    const tpl = form.sms_templates[tIndex];
    updateTemplate(tIndex, {
      parameters: [...tpl.parameters, { name: "Param", label_fa: "پارامتر" }],
    });
  }

  function removeTemplateParam(tIndex: number, pIndex: number) {
    if (!form) return;
    const tpl = form.sms_templates[tIndex];
    updateTemplate(tIndex, {
      parameters: tpl.parameters.filter((_, i) => i !== pIndex),
    });
  }

  function addTemplate() {
    if (!form) return;
    const id = `custom_${Date.now()}`;
    setForm({
      ...form,
      sms_templates: [
        ...form.sms_templates,
        {
          id,
          label_fa: "پترن جدید",
          template_id: 0,
          enabled: false,
          parameters: [{ name: "Code", label_fa: "مقدار" }],
        },
      ],
    });
  }

  function removeTemplate(index: number) {
    if (!form) return;
    const tpl = form.sms_templates[index];
    if (tpl.id === "otp_login") {
      setMsg("پترن OTP قابل حذف نیست");
      return;
    }
    setForm({
      ...form,
      sms_templates: form.sms_templates.filter((_, i) => i !== index),
    });
  }

  if (!form) return <p className="text-muted">بارگذاری...</p>;

  const field = (label: string, key: keyof ShopSettingsAdmin, type = "text") => (
    <label className="block text-sm">
      <span className="text-muted">{label}</span>
      <input
        type={type}
        className="mt-1 w-full rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2"
        value={String(form[key] ?? "")}
        onChange={(e) =>
          setForm({
            ...form,
            [key]: type === "number" ? Number(e.target.value) : e.target.value,
          })
        }
      />
    </label>
  );

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold">تنظیمات فروشگاه</h1>
      <p className="mt-2 text-sm text-muted">سئو، ارسال، درگاه زرین‌پال، پیامک sms.ir</p>
      {msg ? (
        <p className={`mt-4 text-sm ${msg.includes("موفق") || msg === "ذخیره شد" ? "text-green-400" : "text-amber-400"}`}>
          {msg}
        </p>
      ) : null}

      <form onSubmit={save} className="mt-8 space-y-8">
        <section className="space-y-4 rounded-2xl border border-theme p-6">
          <h2 className="font-medium">اطلاعات تماس</h2>
          <p className="text-xs text-muted">در نوار بالای هدر (دسکتاپ)، منوی موبایل و فوتر نمایش داده می‌شود.</p>
          {field("تلفن", "contact_phone")}
          {field("ایمیل", "contact_email", "email")}
          {field("واتساپ (شماره)", "contact_whatsapp")}
          {field("تلگرام (یوزرنیم)", "contact_telegram")}
          {field("اینستاگرام (@ یا لینک)", "contact_instagram")}
          {field("آدرس", "contact_address")}
          {field("ساعات پاسخگویی", "contact_hours")}
        </section>

        <section className="space-y-4 rounded-2xl border border-theme p-6">
          <h2 className="font-medium">عمومی و سئو</h2>
          {field("نام فروشگاه", "shop_name")}
          {field("توضیح", "shop_description")}
          {field("عنوان متا پیش‌فرض", "default_meta_title")}
          {field("توضیح متا پیش‌فرض", "default_meta_description")}
          {field("آدرس سایت", "site_url")}
          {field("هزینه ارسال (تومان)", "shipping_flat_toman", "number")}
          {field("Google Analytics ID", "google_analytics_id")}
          <p className="text-xs text-muted">
            تأیید مالکیت در گوگل/Bing/Yandex: متغیرهای env —{" "}
            <code className="text-[var(--accent)]">GOOGLE_SITE_VERIFICATION</code>،{" "}
            <code className="text-[var(--accent)]">BING_SITE_VERIFICATION</code>،{" "}
            <code className="text-[var(--accent)]">YANDEX_SITE_VERIFICATION</code>
          </p>
        </section>

        <section className="space-y-3 rounded-2xl border border-theme p-6">
          <h2 className="font-medium">اتصال ترب (Torob)</h2>
          <p className="text-sm text-muted">
            پس از ثبت‌نام در{" "}
            <a href="https://torob.com/sell/" target="_blank" rel="noreferrer" className="text-[var(--accent)]">
              panel.torob.com
            </a>
            ، این آدرس API را به پشتیبانی ترب بدهید تا محصولات همگام شوند.
          </p>
          <div className="rounded-xl border border-theme bg-[var(--bg-muted)]/40 px-4 py-3 text-sm" dir="ltr">
            {(form.site_url || "https://your-domain.com").replace(/\/$/, "")}/torob_api/v3/products
          </div>
          <ul className="list-inside list-disc text-xs text-muted">
            <li>Product API v3 با احراز هویت JWT ترب</li>
            <li>هر تنوع (رنگ/سایز) به‌صورت جدا در فید — قیمت و موجودی دقیق</li>
            <li>آدرس سایت بالا باید دامنهٔ واقعی HTTPS باشد</li>
          </ul>
        </section>

        <section className="space-y-4 rounded-2xl border border-theme p-6">
          <h2 className="font-medium">درگاه پرداخت</h2>
          <label className="block text-sm">
            <span className="text-muted">درگاه پرداخت</span>
            <select
              className="mt-1 w-full rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2"
              value={form.payment_gateway}
              onChange={(e) => setForm({ ...form, payment_gateway: e.target.value })}
            >
              <option value="mock">آزمایشی (mock)</option>
              <option value="zarinpal">زرین‌پال</option>
            </select>
          </label>
          {field("مرچنت زرین‌پال", "zarinpal_merchant_id")}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.zarinpal_sandbox}
              onChange={(e) => setForm({ ...form, zarinpal_sandbox: e.target.checked })}
            />
            <span>حالت sandbox زرین‌پال</span>
          </label>
          {field("Callback URL (اختیاری)", "zarinpal_callback_url")}
        </section>

        <section className="space-y-4 rounded-2xl border border-theme p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-medium">پیامک sms.ir</h2>
              <p className="mt-1 text-xs text-muted">
                API Key از پنل sms.ir → برنامه‌نویسان. قالب‌ها را در «ارسال سریع» بسازید و Template ID را اینجا وارد کنید.
              </p>
            </div>
            <label className="flex shrink-0 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.sms_enabled}
                onChange={(e) => setForm({ ...form, sms_enabled: e.target.checked })}
              />
              <span>فعال</span>
            </label>
          </div>

          <label className="block text-sm">
            <span className="text-muted">API Key</span>
            <input
              type="password"
              autoComplete="new-password"
              placeholder={form.sms_ir_api_key_set ? "•••••••• (برای تغییر، کلید جدید وارد کنید)" : "کلید API از sms.ir"}
              className="mt-1 w-full rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2"
              value={form.sms_ir_api_key}
              onChange={(e) => setForm({ ...form, sms_ir_api_key: e.target.value })}
            />
          </label>
          {field("آدرس API", "sms_ir_api_base")}
          {field("شماره خط (اختیاری — برای ارسال انبوه)", "sms_ir_line_number")}
          {field("کد OTP توسعه (وقتی SMS غیرفعال است)", "dev_otp_code")}

          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">پترن‌های پیامک</h3>
              <Button type="button" variant="outline" onClick={addTemplate}>
                + پترن جدید
              </Button>
            </div>

            {form.sms_templates.map((tpl, tIndex) => (
              <div key={tpl.id} className="space-y-3 rounded-xl border border-theme/60 bg-[var(--input-bg)]/30 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={tpl.enabled}
                      onChange={(e) => updateTemplate(tIndex, { enabled: e.target.checked })}
                    />
                    <span>فعال</span>
                  </label>
                  <input
                    className="min-w-0 flex-1 rounded-lg border border-theme bg-[var(--input-bg)] px-2 py-1.5 text-sm"
                    value={tpl.label_fa}
                    onChange={(e) => updateTemplate(tIndex, { label_fa: e.target.value })}
                    placeholder="عنوان فارسی"
                  />
                  <input
                    className="w-28 rounded-lg border border-theme bg-[var(--input-bg)] px-2 py-1.5 text-sm font-mono"
                    value={tpl.id}
                    disabled={tpl.id === "otp_login"}
                    onChange={(e) => updateTemplate(tIndex, { id: e.target.value })}
                    placeholder="شناسه"
                  />
                  <input
                    type="number"
                    className="w-32 rounded-lg border border-theme bg-[var(--input-bg)] px-2 py-1.5 text-sm"
                    value={tpl.template_id}
                    onChange={(e) => updateTemplate(tIndex, { template_id: Number(e.target.value) })}
                    placeholder="Template ID"
                  />
                  {tpl.id !== "otp_login" ? (
                    <button
                      type="button"
                      className="text-xs text-red-400 hover:underline"
                      onClick={() => removeTemplate(tIndex)}
                    >
                      حذف
                    </button>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-muted">
                    پارامترها باید دقیقاً با نام‌های تعریف‌شده در پنل sms.ir (بدون #) یکسان باشند.
                  </p>
                  {tpl.parameters.map((p, pIndex) => (
                    <div key={pIndex} className="flex flex-wrap gap-2">
                      <input
                        className="w-36 rounded-lg border border-theme bg-[var(--input-bg)] px-2 py-1.5 text-sm font-mono"
                        value={p.name}
                        onChange={(e) => updateTemplateParam(tIndex, pIndex, { name: e.target.value })}
                        placeholder="Name"
                      />
                      <input
                        className="min-w-0 flex-1 rounded-lg border border-theme bg-[var(--input-bg)] px-2 py-1.5 text-sm"
                        value={p.label_fa}
                        onChange={(e) => updateTemplateParam(tIndex, pIndex, { label_fa: e.target.value })}
                        placeholder="برچسب فارسی"
                      />
                      <button
                        type="button"
                        className="text-xs text-muted hover:text-red-400"
                        onClick={() => removeTemplateParam(tIndex, pIndex)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="text-xs text-muted hover:text-foreground"
                    onClick={() => addTemplateParam(tIndex)}
                  >
                    + پارامتر
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-end gap-3 border-t border-theme pt-4">
            <label className="block text-sm">
              <span className="text-muted">تست ارسال</span>
              <input
                className="mt-1 w-44 rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="0912..."
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted">پترن</span>
              <select
                className="mt-1 rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2"
                value={testTemplateId}
                onChange={(e) => setTestTemplateId(e.target.value)}
              >
                {form.sms_templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label_fa}
                  </option>
                ))}
              </select>
            </label>
            <Button type="button" variant="outline" disabled={testing} onClick={() => void testSms()}>
              {testing ? "..." : "ارسال تست"}
            </Button>
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-theme p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-medium">هوش مصنوعی AvalAI</h2>
              <p className="mt-1 text-xs text-muted">
                کلید API از{" "}
                <a href="https://avalai.ir" target="_blank" rel="noopener noreferrer" className="underline">
                  avalai.ir
                </a>{" "}
                — برای تولید طرح در Design Lab.{" "}
                <a href="/admin/ai" className="underline">
                  مدیریت پرامپت‌ها و لاگ‌ها
                </a>
              </p>
            </div>
            <label className="flex shrink-0 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.avalai_enabled}
                onChange={(e) => setForm({ ...form, avalai_enabled: e.target.checked })}
              />
              <span>فعال</span>
            </label>
          </div>

          <label className="block text-sm">
            <span className="text-muted">API Key</span>
            <input
              type="password"
              autoComplete="new-password"
              placeholder={
                form.avalai_api_key_set
                  ? "•••••••• (برای تغییر، کلید جدید وارد کنید)"
                  : "کلید API از پنل AvalAI"
              }
              className="mt-1 w-full rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2"
              value={form.avalai_api_key}
              onChange={(e) => setForm({ ...form, avalai_api_key: e.target.value })}
            />
          </label>

          <label className="block text-sm">
            <span className="text-muted">مدل تولید تصویر</span>
            <select
              className="mt-1 w-full rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2"
              value={form.avalai_image_model}
              onChange={(e) => setForm({ ...form, avalai_image_model: e.target.value })}
            >
              <option value="gemini-2.5-flash-image">gemini-2.5-flash-image (سریع — پیشنهادی)</option>
              <option value="gemini-3.1-flash-image-preview">gemini-3.1-flash-image-preview (جایگزین سریع)</option>
              <option value="gemini-3-pro-image-preview">gemini-3-pro-image-preview (کیفیت بالاتر)</option>
              <option value="gpt-image-1">gpt-image-1 (پشتیبان)</option>
            </select>
          </label>

          <div className="space-y-3 rounded-xl border border-theme/60 bg-[var(--input-bg)]/30 p-4">
            <h3 className="text-sm font-medium">محدودیت مصرف (ضد سوءاستفاده)</h3>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.avalai_require_login}
                onChange={(e) => setForm({ ...form, avalai_require_login: e.target.checked })}
              />
              <span>فقط کاربران واردشده</span>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="text-muted">حداکثر هر کاربر در ساعت</span>
                <input
                  type="number"
                  min={1}
                  max={20}
                  className="mt-1 w-full rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2"
                  value={form.avalai_max_per_user_hour}
                  onChange={(e) =>
                    setForm({ ...form, avalai_max_per_user_hour: Number(e.target.value) })
                  }
                />
              </label>
              <label className="block text-sm">
                <span className="text-muted">حداکثر هر کاربر در روز</span>
                <input
                  type="number"
                  min={1}
                  max={50}
                  className="mt-1 w-full rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2"
                  value={form.avalai_max_per_user_day}
                  onChange={(e) =>
                    setForm({ ...form, avalai_max_per_user_day: Number(e.target.value) })
                  }
                />
              </label>
              <label className="block text-sm">
                <span className="text-muted">سقف کل سایت در روز</span>
                <input
                  type="number"
                  min={5}
                  max={500}
                  className="mt-1 w-full rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2"
                  value={form.avalai_max_global_day}
                  onChange={(e) =>
                    setForm({ ...form, avalai_max_global_day: Number(e.target.value) })
                  }
                />
              </label>
              <label className="block text-sm">
                <span className="text-muted">حداکثر هر IP در ساعت</span>
                <input
                  type="number"
                  min={1}
                  max={30}
                  className="mt-1 w-full rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2"
                  value={form.avalai_max_per_ip_hour}
                  onChange={(e) =>
                    setForm({ ...form, avalai_max_per_ip_hour: Number(e.target.value) })
                  }
                />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="text-muted">فاصله بین دو درخواست (ثانیه)</span>
                <input
                  type="number"
                  min={10}
                  max={300}
                  className="mt-1 w-full rounded-xl border border-theme bg-[var(--input-bg)] px-3 py-2"
                  value={form.avalai_cooldown_seconds}
                  onChange={(e) =>
                    setForm({ ...form, avalai_cooldown_seconds: Number(e.target.value) })
                  }
                />
              </label>
            </div>
            <p className="text-xs text-muted">
              ادمین و اپراتور از سقف کاربر معاف‌اند. تکرار همان prompt در ۵ دقیقه مسدود می‌شود.
              در صورت خطای مکرر «شلوغی»، اعتبار و سقف درخواست را در پنل سرویس‌دهنده (AvalAI) بررسی کنید.
            </p>
          </div>
        </section>

        <Button type="submit" disabled={saving}>
          {saving ? "..." : "ذخیره تنظیمات"}
        </Button>
      </form>
    </div>
  );
}
