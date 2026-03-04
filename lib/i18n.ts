export const supportedLanguages = ["en", "hi", "mr", "bn", "ta", "te", "gu", "kn", "ml", "pa"] as const

export type LanguageCode = (typeof supportedLanguages)[number]

export const languageNames: Record<LanguageCode, string> = {
  en: "English",
  hi: "Hindi",
  mr: "Marathi",
  bn: "Bengali",
  ta: "Tamil",
  te: "Telugu",
  gu: "Gujarati",
  kn: "Kannada",
  ml: "Malayalam",
  pa: "Punjabi",
}

type Dictionary = {
  navbar: {
    features: string
    blog: string
    products: string
    customStitching: string
    searchPlaceholder: string
    searchButton: string
    goButton: string
    dashboard: string
    signIn: string
    signUp: string
    cart: string
    wishlist: string
  }
  common: {
    home: string
    products: string
    blog: string
    search: string
    noDescription: string
    na: string
    material: string
    color: string
    size: string
    stock: string
    filters: string
    applyFilters: string
    close: string
    allCategories: string
    allMaterials: string
    allClothTypes: string
    allColors: string
    allSizes: string
    newest: string
    priceLowToHigh: string
    priceHighToLow: string
    nameAZ: string
  }
  footer: {
    description: string
    explore: string
    company: string
    contact: string
    createAccount: string
    notifications: string
    rights: string
    tagline: string
  }
  home: {
    heroTitle: string
    heroDescription: string
    startCustomOrder: string
    browseProducts: string
    whyChoose: string
    servicesTitle: string
    expertTailoringTitle: string
    expertTailoringDesc: string
    premiumCollectionTitle: string
    premiumCollectionDesc: string
    easyTrackingTitle: string
    easyTrackingDesc: string
    customStitchingTitle: string
    readyMadeTitle: string
    customPoints: string[]
    readyMadePoints: string[]
  }
  featuresPage: {
    title: string
    subtitle: string
    expertTitle: string
    expertDesc: string
    ecommerceTitle: string
    ecommerceDesc: string
    trackingTitle: string
    trackingDesc: string
    whatUsersCanDo: string
    points: string[]
    shopProducts: string
    bookCustomStitching: string
  }
  customStitching: {
    badge: string
    title: string
    subtitle: string
    step1Title: string
    step1Desc: string
    step2Title: string
    step2Desc: string
    step3Title: string
    step3Desc: string
    readyTitle: string
    signedInCustomer: string
    signedInOtherRole: string
    notSignedIn: string
    bookNow: string
    continueBooking: string
    openDashboard: string
    createAccount: string
  }
  productsPage: {
    title: string
    subtitle: string
    searchPlaceholder: string
    minPrice: string
    maxPrice: string
    noProductsTitle: string
    noProductsDesc: string
    showingPage: string
  }
  blogPage: {
    title: string
    subtitle: string
    featured: string
    categories: string
    noPosts: string
    seoNote: string
    backToBlog: string
  }
}

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Array<infer U> ? Array<U> : T[K] extends object ? DeepPartial<T[K]> : T[K]
}

const englishDictionary: Dictionary = {
  navbar: {
    features: "Features",
    blog: "Blog",
    products: "Products",
    customStitching: "Custom Stitching",
    searchPlaceholder: "Search products, blogs, colors, styles...",
    searchButton: "Search",
    goButton: "Go",
    dashboard: "Dashboard",
    signIn: "Sign In",
    signUp: "Sign Up",
    cart: "Cart",
    wishlist: "Wishlist",
  },
  common: {
    home: "Home",
    products: "Products",
    blog: "Blog",
    search: "Search",
    noDescription: "No description available.",
    na: "N/A",
    material: "Material",
    color: "Color",
    size: "Size",
    stock: "Stock",
    filters: "Filters",
    applyFilters: "Apply Filters",
    close: "Close",
    allCategories: "All Categories",
    allMaterials: "All Materials",
    allClothTypes: "All Cloth Types",
    allColors: "All Colors",
    allSizes: "All Sizes",
    newest: "Newest",
    priceLowToHigh: "Price: Low to High",
    priceHighToLow: "Price: High to Low",
    nameAZ: "Name: A-Z",
  },
  footer: {
    description: "Premium ready-made fashion and expert custom stitching in one modern experience.",
    explore: "Explore",
    company: "Company",
    contact: "Contact",
    createAccount: "Create Account",
    notifications: "Notifications",
    rights: "All rights reserved.",
    tagline: "Built for fit, comfort, and style.",
  },
  home: {
    heroTitle: "Perfect Fit, Every Time",
    heroDescription: "Get custom-tailored clothing with expert craftsmanship or choose from our premium ready-made collection.",
    startCustomOrder: "Start Custom Order",
    browseProducts: "Browse Products",
    whyChoose: "Why Choose TailorHub?",
    servicesTitle: "Our Services",
    expertTailoringTitle: "Expert Tailoring",
    expertTailoringDesc: "Professional tailors with years of experience",
    premiumCollectionTitle: "Premium Collection",
    premiumCollectionDesc: "Curated ready-made garments of the highest quality",
    easyTrackingTitle: "Easy Tracking",
    easyTrackingDesc: "Real-time order tracking and status updates",
    customStitchingTitle: "Custom Stitching",
    readyMadeTitle: "Ready-Made Clothing",
    customPoints: [
      "Choose your fabric and design",
      "Save custom measurements",
      "Expert tailors assigned",
      "Track progress in real-time",
      "Rate your tailor",
    ],
    readyMadePoints: [
      "Premium quality garments",
      "Variety of styles and sizes",
      "Easy checkout process",
      "Fast delivery",
      "Customer reviews & ratings",
    ],
  },
  featuresPage: {
    title: "Platform Features",
    subtitle: "TailorHub combines online shopping with custom stitching so users can choose ready-made products or book personalized tailoring.",
    expertTitle: "Expert Tailoring",
    expertDesc: "Professional tailoring by experienced specialists for daily and occasion wear.",
    ecommerceTitle: "E-commerce Ready",
    ecommerceDesc: "Browse products, add to cart, and shop directly from our ready-made collection.",
    trackingTitle: "Transparent Tracking",
    trackingDesc: "Follow your order progress with clear milestones from assignment to delivery.",
    whatUsersCanDo: "What Users Can Do",
    points: [
      "Product catalog and cart for instant purchase",
      "Custom stitching flow with measurement support",
      "Role-based system for admin, tailor, and customer",
      "Public blog and search for style and tailoring guidance",
    ],
    shopProducts: "Shop Products",
    bookCustomStitching: "Book Custom Stitching",
  },
  customStitching: {
    badge: "TailorHub Studio",
    title: "Custom Stitching",
    subtitle: "Share your style, measurements, and fabric preference. Our tailors deliver precise fit and finish from first cut to final delivery.",
    step1Title: "1. Submit Requirements",
    step1Desc: "Select cloth type, upload reference, and provide notes.",
    step2Title: "2. Tailor Assignment",
    step2Desc: "An expert tailor is assigned to your request.",
    step3Title: "3. Track Progress",
    step3Desc: "Follow status from pending to delivered.",
    readyTitle: "Ready to place a custom stitching order?",
    signedInCustomer: "You are signed in. Continue to measurement and custom booking.",
    signedInOtherRole: "You are signed in with a non-customer role. Use your dashboard to continue.",
    notSignedIn: "You can start the booking flow now. If you are not signed in, you will be asked to log in first.",
    bookNow: "Book Now",
    continueBooking: "Continue Booking",
    openDashboard: "Open Dashboard",
    createAccount: "Create Account",
  },
  productsPage: {
    title: "Clothing Store",
    subtitle: "Find outfits by cloth type, color, category, size, and budget.",
    searchPlaceholder: "Search",
    minPrice: "Min",
    maxPrice: "Max",
    noProductsTitle: "No products found",
    noProductsDesc: "Try adjusting your filters or search terms.",
    showingPage: "Showing page",
  },
  blogPage: {
    title: "TailorHub Journal",
    subtitle: "Style tips, tailoring guides, and fabric insights.",
    featured: "Featured",
    categories: "Categories",
    noPosts: "No blog posts available.",
    seoNote: "All blog content is server-rendered from the database for fresh and SEO-friendly pages.",
    backToBlog: "Back to Blog",
  },
}

const hindiDictionary: DeepPartial<Dictionary> = {
  footer: {
    explore: "एक्सप्लोर",
    company: "कंपनी",
    contact: "संपर्क",
    createAccount: "अकाउंट बनाएं",
    notifications: "नोटिफिकेशन्स",
    rights: "सभी अधिकार सुरक्षित।",
    tagline: "फिट, आराम और स्टाइल के लिए बनाया गया।",
    description: "प्रीमियम रेडीमेड फैशन और एक्सपर्ट कस्टम स्टिचिंग एक ही आधुनिक अनुभव में।",
  },
  common: {
    home: "होम",
    products: "प्रोडक्ट्स",
    blog: "ब्लॉग",
    search: "खोज",
    filters: "फिल्टर्स",
    applyFilters: "फिल्टर्स लागू करें",
    close: "बंद करें",
  },
  home: {
    heroTitle: "हर बार परफेक्ट फिट",
    heroDescription: "एक्सपर्ट टेलरिंग के साथ कस्टम कपड़े बनवाएं या हमारी प्रीमियम रेडीमेड कलेक्शन चुनें।",
    startCustomOrder: "कस्टम ऑर्डर शुरू करें",
    browseProducts: "प्रोडक्ट्स देखें",
    whyChoose: "TailorHub क्यों चुनें?",
    servicesTitle: "हमारी सेवाएं",
  },
  featuresPage: {
    title: "प्लेटफ़ॉर्म फीचर्स",
    subtitle: "TailorHub ऑनलाइन शॉपिंग और कस्टम स्टिचिंग को एक साथ लाता है।",
    whatUsersCanDo: "यूज़र क्या कर सकते हैं",
    shopProducts: "प्रोडक्ट्स खरीदें",
    bookCustomStitching: "कस्टम स्टिचिंग बुक करें",
  },
  customStitching: {
    title: "कस्टम स्टिचिंग",
    readyTitle: "कस्टम स्टिचिंग ऑर्डर देने के लिए तैयार हैं?",
    bookNow: "अभी बुक करें",
    continueBooking: "बुकिंग जारी रखें",
    openDashboard: "डैशबोर्ड खोलें",
    createAccount: "अकाउंट बनाएं",
  },
  productsPage: {
    title: "कपड़ों की दुकान",
    subtitle: "कपड़े के प्रकार, रंग, कैटेगरी, साइज और बजट के अनुसार खोजें।",
    noProductsTitle: "कोई प्रोडक्ट नहीं मिला",
    noProductsDesc: "फिल्टर या सर्च टर्म बदलकर देखें।",
  },
  blogPage: {
    title: "TailorHub जर्नल",
    subtitle: "स्टाइल टिप्स, टेलरिंग गाइड्स और फैब्रिक जानकारी।",
    categories: "कैटेगरी",
    noPosts: "कोई ब्लॉग पोस्ट उपलब्ध नहीं है।",
    backToBlog: "ब्लॉग पर वापस जाएं",
  },
}

const marathiDictionary: DeepPartial<Dictionary> = {
  footer: {
    explore: "एक्सप्लोर",
    company: "कंपनी",
    contact: "संपर्क",
    createAccount: "अकाउंट तयार करा",
    notifications: "सूचना",
    rights: "सर्व हक्क राखीव.",
    tagline: "फिट, आराम आणि स्टाइलसाठी तयार.",
    description: "प्रीमियम रेडीमेड फॅशन आणि तज्ज्ञ कस्टम शिवणकाम एकाच आधुनिक अनुभवात.",
  },
  common: {
    home: "मुख्यपृष्ठ",
    products: "उत्पादने",
    blog: "ब्लॉग",
    search: "शोध",
    filters: "फिल्टर्स",
    applyFilters: "फिल्टर्स लागू करा",
    close: "बंद करा",
  },
  home: {
    heroTitle: "दरवेळी परफेक्ट फिट",
    heroDescription: "तज्ज्ञ टेलरिंगसह कस्टम कपडे तयार करा किंवा आमच्या प्रीमियम रेडीमेड कलेक्शनमधून निवडा.",
    startCustomOrder: "कस्टम ऑर्डर सुरू करा",
    browseProducts: "उत्पादने पाहा",
    whyChoose: "TailorHub का निवडावे?",
    servicesTitle: "आमच्या सेवा",
  },
  featuresPage: {
    title: "प्लॅटफॉर्म वैशिष्ट्ये",
    subtitle: "TailorHub ऑनलाइन शॉपिंग आणि कस्टम शिवणकाम एकत्र आणतो.",
    whatUsersCanDo: "वापरकर्ते काय करू शकतात",
    shopProducts: "उत्पादने खरेदी करा",
    bookCustomStitching: "कस्टम शिवणकाम बुक करा",
  },
  customStitching: {
    title: "कस्टम शिवणकाम",
    readyTitle: "कस्टम शिवणकाम ऑर्डरसाठी तयार आहात?",
    bookNow: "आता बुक करा",
    continueBooking: "बुकिंग सुरू ठेवा",
    openDashboard: "डॅशबोर्ड उघडा",
    createAccount: "अकाउंट तयार करा",
  },
  productsPage: {
    title: "कपड्यांचे स्टोअर",
    subtitle: "कपड्यांचा प्रकार, रंग, वर्ग, आकार आणि बजेटनुसार शोधा.",
    noProductsTitle: "उत्पादने आढळली नाहीत",
    noProductsDesc: "फिल्टर्स किंवा शोध बदलून पहा.",
  },
  blogPage: {
    title: "TailorHub जर्नल",
    subtitle: "स्टाइल टिप्स, टेलरिंग मार्गदर्शक आणि फॅब्रिक माहिती.",
    categories: "वर्ग",
    noPosts: "ब्लॉग पोस्ट उपलब्ध नाहीत.",
    backToBlog: "ब्लॉगवर परत जा",
  },
}

const dictionaries: Partial<Record<LanguageCode, DeepPartial<Dictionary>>> = {
  en: englishDictionary,
  hi: hindiDictionary,
  mr: marathiDictionary,
}

function mergeSection<T>(base: T, override: DeepPartial<T> | undefined): T {
  if (!override) return base
  return { ...base, ...override }
}

function deepMergeDictionary(base: Dictionary, override: DeepPartial<Dictionary> | undefined): Dictionary {
  if (!override) return base
  return {
    navbar: mergeSection(base.navbar, override.navbar),
    common: mergeSection(base.common, override.common),
    footer: mergeSection(base.footer, override.footer),
    home: mergeSection(base.home, override.home),
    featuresPage: mergeSection(base.featuresPage, override.featuresPage),
    customStitching: mergeSection(base.customStitching, override.customStitching),
    productsPage: mergeSection(base.productsPage, override.productsPage),
    blogPage: mergeSection(base.blogPage, override.blogPage),
  }
}

export function normalizeLanguage(input: string | null | undefined): LanguageCode {
  const normalized = String(input || "en").toLowerCase().trim()
  return (supportedLanguages as readonly string[]).includes(normalized) ? (normalized as LanguageCode) : "en"
}

export function getDictionary(language: string | null | undefined): Dictionary {
  const normalized = normalizeLanguage(language)
  return deepMergeDictionary(englishDictionary, dictionaries[normalized])
}
