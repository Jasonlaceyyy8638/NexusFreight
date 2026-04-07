/** Major US wireless carriers — email-to-SMS gateway host (no @ prefix). */
export type WirelessCarrierOption = {
  name: string;
  domain: string;
};

export const US_WIRELESS_CARRIERS: WirelessCarrierOption[] = [
  { name: "Verizon", domain: "vtext.com" },
  { name: "AT&T", domain: "txt.att.net" },
  { name: "T-Mobile", domain: "tmomail.net" },
  { name: "Boost Mobile", domain: "myboostmobile.com" },
  { name: "Cricket", domain: "sms.mycricket.com" },
  { name: "MetroPCS", domain: "mymetropcs.com" },
  { name: "US Cellular", domain: "email.uscc.net" },
];
