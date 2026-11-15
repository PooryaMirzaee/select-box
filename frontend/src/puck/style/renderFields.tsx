import { FieldGroup, FieldTab } from "@puckeditor/core";
import type { ReactNode } from "react";
import { CHROME_FIELD_KEYS } from "./fields";

type FieldsMap = Record<string, ReactNode>;

type TabbedFieldsProps = {
  fields: FieldsMap;
  content?: string[];
  contentLabel?: string;
  extraAppearance?: string[];
  extraSpacing?: string[];
  extraAdvanced?: string[];
};

function pick(fields: FieldsMap, keys: string[]) {
  return keys.map((key) => fields[key]).filter(Boolean);
}

/**
 * قالب مشترک تب‌های فارسی محتوا / ظاهر / فاصله‌ها / پیشرفته
 * باید داخل `renderFields` با propهای `{ fields }` استفاده شود.
 */
export function StyleFieldTabs({
  fields,
  content = [],
  contentLabel = "محتوا",
  extraAppearance = [],
  extraSpacing = [],
  extraAdvanced = [],
}: TabbedFieldsProps) {
  return (
    <>
      {content.length > 0 ? (
        <FieldTab label={contentLabel} value="content">
          <FieldGroup label={contentLabel} defaultExpanded>
            {pick(fields, content)}
          </FieldGroup>
        </FieldTab>
      ) : null}
      <FieldTab label="ظاهر" value="appearance">
        <FieldGroup label="پس‌زمینه و تایپوگرافی" defaultExpanded>
          {pick(fields, [...CHROME_FIELD_KEYS.appearance, ...extraAppearance])}
        </FieldGroup>
      </FieldTab>
      <FieldTab label="فاصله‌ها" value="spacing">
        <FieldGroup label="پدینگ و مارجین" defaultExpanded>
          {pick(fields, [...CHROME_FIELD_KEYS.spacing, ...extraSpacing])}
        </FieldGroup>
      </FieldTab>
      <FieldTab label="پیشرفته" value="advanced">
        <FieldGroup label="CSS و نمایش" defaultExpanded>
          {pick(fields, [...CHROME_FIELD_KEYS.advanced, ...extraAdvanced])}
        </FieldGroup>
      </FieldTab>
    </>
  );
}

/** کمک برای تعریف کوتاه renderFields در کامپوننت‌ها */
export function styleTabs(opts: Omit<TabbedFieldsProps, "fields">) {
  return function RenderStyleTabs({ fields }: { fields: FieldsMap }) {
    return <StyleFieldTabs fields={fields} {...opts} />;
  };
}
