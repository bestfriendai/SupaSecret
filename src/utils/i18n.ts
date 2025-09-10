import { I18n } from "i18n-js";
import * as Localization from "expo-localization";

// Define supported locales
export const SUPPORTED_LOCALES = ["en", "es", "fr", "de", "pt", "it", "ja", "ko", "zh"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

// Translation keys interface for type safety
export interface TranslationKeys {
  // Common
  common: {
    ok: string;
    cancel: string;
    save: string;
    delete: string;
    edit: string;
    loading: string;
    error: string;
    retry: string;
    share: string;
    report: string;
    like: string;
    reply: string;
    anonymous: string;
  };

  // Navigation
  navigation: {
    home: string;
    videos: string;
    create: string;
    trending: string;
    profile: string;
    settings: string;
    secrets: string;
  };

  // Auth
  auth: {
    signIn: string;
    signUp: string;
    signOut: string;
    email: string;
    password: string;
    confirmPassword: string;
    forgotPassword: string;
    createAccount: string;
    welcomeBack: string;
    getStarted: string;
  };

  // Confessions
  confessions: {
    title: string;
    placeholder: string;
    submit: string;
    anonymous: string;
    video: string;
    text: string;
    noConfessions: string;
    loadMore: string;
    refreshing: string;
  };

  // Trending
  trending: {
    title: string;
    hashtags: string;
    secrets: string;
    noTrending: string;
    searchPlaceholder: string;
    timeframes: {
      day: string;
      week: string;
      month: string;
    };
  };

  // Reports
  reports: {
    title: string;
    reasons: {
      inappropriate_content: string;
      spam: string;
      harassment: string;
      false_information: string;
      violence: string;
      hate_speech: string;
      other: string;
    };
    additionalDetails: string;
    submit: string;
    submitted: string;
    submittedMessage: string;
  };

  // Settings
  settings: {
    title: string;
    language: string;
    notifications: string;
    privacy: string;
    about: string;
    support: string;
    rateApp: string;
    shareApp: string;
  };

  // Errors
  errors: {
    network: string;
    generic: string;
    unauthorized: string;
    notFound: string;
    serverError: string;
  };
}

// English translations (default)
const en: TranslationKeys = {
  common: {
    ok: "OK",
    cancel: "Cancel",
    save: "Save",
    delete: "Delete",
    edit: "Edit",
    loading: "Loading...",
    error: "Error",
    retry: "Retry",
    share: "Share",
    report: "Report",
    like: "Like",
    reply: "Reply",
    anonymous: "Anonymous",
  },
  navigation: {
    home: "Home",
    videos: "Videos",
    create: "Create",
    trending: "Trending",
    profile: "Profile",
    settings: "Settings",
    secrets: "Secrets",
  },
  auth: {
    signIn: "Sign In",
    signUp: "Sign Up",
    signOut: "Sign Out",
    email: "Email",
    password: "Password",
    confirmPassword: "Confirm Password",
    forgotPassword: "Forgot Password?",
    createAccount: "Create Account",
    welcomeBack: "Welcome Back",
    getStarted: "Get Started",
  },
  confessions: {
    title: "Toxic Confessions",
    placeholder: "Share your anonymous confession...",
    submit: "Submit",
    anonymous: "Anonymous",
    video: "Video",
    text: "Text",
    noConfessions: "No confessions yet",
    loadMore: "Load More",
    refreshing: "Refreshing...",
  },
  trending: {
    title: "Trending",
    hashtags: "Hashtags",
    secrets: "Secrets",
    noTrending: "No trending content",
    searchPlaceholder: "Search hashtags...",
    timeframes: {
      day: "24h",
      week: "7d",
      month: "30d",
    },
  },
  reports: {
    title: "Report Content",
    reasons: {
      inappropriate_content: "Inappropriate Content",
      spam: "Spam",
      harassment: "Harassment",
      false_information: "False Information",
      violence: "Violence",
      hate_speech: "Hate Speech",
      other: "Other",
    },
    additionalDetails: "Additional Details",
    submit: "Submit Report",
    submitted: "Report Submitted",
    submittedMessage: "Thank you for reporting. We'll review it and take appropriate action.",
  },
  settings: {
    title: "Settings",
    language: "Language",
    notifications: "Notifications",
    privacy: "Privacy",
    about: "About",
    support: "Support",
    rateApp: "Rate App",
    shareApp: "Share App",
  },
  errors: {
    network: "Network error. Please check your connection.",
    generic: "Something went wrong. Please try again.",
    unauthorized: "You need to sign in to continue.",
    notFound: "Content not found.",
    serverError: "Server error. Please try again later.",
  },
};

// Spanish translations
const es: TranslationKeys = {
  common: {
    ok: "OK",
    cancel: "Cancelar",
    save: "Guardar",
    delete: "Eliminar",
    edit: "Editar",
    loading: "Cargando...",
    error: "Error",
    retry: "Reintentar",
    share: "Compartir",
    report: "Reportar",
    like: "Me gusta",
    reply: "Responder",
    anonymous: "Anónimo",
  },
  navigation: {
    home: "Inicio",
    videos: "Videos",
    create: "Crear",
    trending: "Tendencias",
    profile: "Perfil",
    settings: "Configuración",
    secrets: "Secretos",
  },
  auth: {
    signIn: "Iniciar Sesión",
    signUp: "Registrarse",
    signOut: "Cerrar Sesión",
    email: "Correo",
    password: "Contraseña",
    confirmPassword: "Confirmar Contraseña",
    forgotPassword: "¿Olvidaste tu contraseña?",
    createAccount: "Crear Cuenta",
    welcomeBack: "Bienvenido de Vuelta",
    getStarted: "Comenzar",
  },
  confessions: {
    title: "Confesiones Tóxicas",
    placeholder: "Comparte tu confesión anónima...",
    submit: "Enviar",
    anonymous: "Anónimo",
    video: "Video",
    text: "Texto",
    noConfessions: "No hay confesiones aún",
    loadMore: "Cargar Más",
    refreshing: "Actualizando...",
  },
  trending: {
    title: "Tendencias",
    hashtags: "Hashtags",
    secrets: "Secretos",
    noTrending: "No hay contenido en tendencia",
    searchPlaceholder: "Buscar hashtags...",
    timeframes: {
      day: "24h",
      week: "7d",
      month: "30d",
    },
  },
  reports: {
    title: "Reportar Contenido",
    reasons: {
      inappropriate_content: "Contenido Inapropiado",
      spam: "Spam",
      harassment: "Acoso",
      false_information: "Información Falsa",
      violence: "Violencia",
      hate_speech: "Discurso de Odio",
      other: "Otro",
    },
    additionalDetails: "Detalles Adicionales",
    submit: "Enviar Reporte",
    submitted: "Reporte Enviado",
    submittedMessage: "Gracias por reportar. Lo revisaremos y tomaremos las medidas apropiadas.",
  },
  settings: {
    title: "Configuración",
    language: "Idioma",
    notifications: "Notificaciones",
    privacy: "Privacidad",
    about: "Acerca de",
    support: "Soporte",
    rateApp: "Calificar App",
    shareApp: "Compartir App",
  },
  errors: {
    network: "Error de red. Por favor verifica tu conexión.",
    generic: "Algo salió mal. Por favor intenta de nuevo.",
    unauthorized: "Necesitas iniciar sesión para continuar.",
    notFound: "Contenido no encontrado.",
    serverError: "Error del servidor. Por favor intenta más tarde.",
  },
};

// Initialize i18n
const i18n = new I18n({
  en,
  es,
});

// Set default locale
i18n.defaultLocale = "en";
i18n.enableFallback = true;

// Get device locale and set it
const deviceLocale = Localization.getLocales()[0]?.languageCode || "en";
i18n.locale = SUPPORTED_LOCALES.includes(deviceLocale as SupportedLocale) ? deviceLocale : "en";

// Export i18n instance and helper functions
export { i18n };

export const t = (key: string, options?: any): string => {
  return i18n.t(key, options);
};

export const getCurrentLocale = (): string => {
  return i18n.locale;
};

export const setLocale = (locale: SupportedLocale): void => {
  i18n.locale = locale;
};

export const getSupportedLocales = (): readonly SupportedLocale[] => {
  return SUPPORTED_LOCALES;
};
