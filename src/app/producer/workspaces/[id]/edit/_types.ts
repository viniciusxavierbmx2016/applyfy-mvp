export type LoginLayout = "central" | "lateral-left" | "lateral-right";

export interface Workspace {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  loginLayout: LoginLayout;
  loginBgImageUrl: string | null;
  loginBgColor: string | null;
  loginPrimaryColor: string | null;
  loginLogoUrl: string | null;
  loginTitle: string | null;
  loginSubtitle: string | null;
  loginBoxColor: string | null;
  loginBoxOpacity: number | null;
  loginSideColor: string | null;
  loginLinkColor: string | null;
  loginTextColor: string | null;
  loginSecondaryTextColor: string | null;
  masterPassword: string | null;
  accentColor: string | null;
  bannerUrl: string | null;
  bannerPosition: string | null;
  faviconUrl: string | null;
  forceTheme: string | null;
  customDomain: string | null;
  // Contato de suporte do workspace — a tela já lia estes dois; o tipo é que
  // não os declarava (nem loginTextColor/loginSecondaryTextColor acima). Ficou
  // invisível porque r.json() é `any` e o acesso nunca era checado.
  supportEmail: string | null;
  supportWhatsapp: string | null;
  isActive: boolean;
  // Access-email customization (step 5)
  emailLogoUrl: string | null;
  emailPrimaryColor: string | null;
  emailBgColor: string | null;
  emailBoxColor: string | null;
  emailTitle: string | null;
  emailBody: string | null;
  emailFooter: string | null;
  emailCustomHtml: string | null;
  emailUseCustomHtml: boolean;
}

export type TabKey = "info" | "login" | "appearance" | "email";

export interface ImagePosition {
  x: number;
  y: number;
}

export interface EmailConfig {
  emailLogoUrl: string;
  emailPrimaryColor: string;
  emailBgColor: string;
  emailBoxColor: string;
  emailTitle: string;
  emailBody: string;
  emailFooter: string;
  emailCustomHtml: string;
  emailUseCustomHtml: boolean;
}
