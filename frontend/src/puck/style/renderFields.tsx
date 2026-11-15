import { FieldGroup, FieldTab } from "@puckeditor/core";
import type { ReactNode } from "react";
import { CHROME_FIELD_KEYS } from "./fields";

type TabbedFieldsProps = {
  content?: string[];
  contentLabel?: string;
  extraAppearance?: string[];
  extraSpacing?: string[];
  extraAdvanced?: string[];
  children?: ReactNode;
};

/**
 * قالب مشترک تب‌های فارسی محتوا / ظاهر / فاصله‌ها / پیشرفته
 * باید داخل `renderFields` کامپوننت Puck استفاده شود.
 */
export function StyleFieldTabs({
  content = [],
  contentLabel = "محتوا",
  extraAppearance = [],
  extraSpacing = [],
  extraAdvanced = [],
}: TabbedFieldsProps) {
  return (
    <>
      {content.length > 0 ? (
        <FieldTab label={contentLabel}>
          <FieldGroup label={contentLabel}>{content}</FieldGroup>
        </FieldTab>
      ) : null}
      <FieldTab label="ظاهر">
        <FieldGroup label="پس‌زمینه و تایپوگرافی">
          {[...CHROME_FIELD_KEYS.appearance, ...extraAppearance]}
        </FieldGroup>
      </FieldTab>
      <FieldTab label="فاصله‌ها">
        <FieldGroup label="پدینگ و مارجین">
          {[...CHROME_FIELD_KEYS.spacing, ...extraSpacing]}
        </FieldGroup>
      </FieldTab>
      <FieldTab label="پیشرفته">
        <FieldGroup label="CSS و نمایش">
          {[...CHROME_FIELD_KEYS.advanced, ...extraAdvanced]}
        </FieldGroup>
      </FieldTab>
    </>
  );
}
