export type ShopContactInfo = {
  contact_phone: string;
  contact_email: string;
  contact_whatsapp: string;
  contact_telegram: string;
  contact_instagram: string;
  contact_address: string;
  contact_hours: string;
};

export const EMPTY_CONTACT: ShopContactInfo = {
  contact_phone: "",
  contact_email: "",
  contact_whatsapp: "",
  contact_telegram: "",
  contact_instagram: "",
  contact_address: "",
  contact_hours: "",
};
