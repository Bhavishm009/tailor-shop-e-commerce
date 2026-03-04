type ProductLike = {
  id: string
  name: string
  description?: string | null
  category?: string | null
  material?: string | null
  clothType?: string | null
  color?: string | null
  colors?: unknown
  tags?: unknown
  highlights?: unknown
  createdAt?: Date | string
}

type BlogLike = {
  id: string
  title: string
  excerpt?: string | null
  category?: string | null
  contentHtml?: string | null
  createdAt?: Date | string
}

const colorAliases: Record<string, string[]> = {
  red: ["red", "maroon", "crimson", "laal", "lal", "लाल", "तांबडा"],
  black: ["black", "jet", "charcoal", "kala", "kaala", "काला", "काळा"],
  blue: ["blue", "navy", "sky", "neela", "नीला", "निळा"],
  white: ["white", "offwhite", "cream", "safed", "सफेद", "पांढरा"],
  green: ["green", "olive", "hara", "हरा", "हिरवा"],
  yellow: ["yellow", "mustard", "peela", "पीला", "पिवळा"],
  pink: ["pink", "gulabi", "गुलाबी"],
  orange: ["orange", "kesari", "केसरिया", "नारिंगी"],
  brown: ["brown", "khaki", "bhura", "भूरा", "तपकिरी"],
  gray: ["gray", "grey", "slate", "dhusar", "धूसर", "राखाडी"],
}

const garmentAliases: Record<string, string[]> = {
  shirt: ["shirt", "shirts", "kurta", "kurti", "top", "शर्ट", "कुर्ता", "कुर्ती"],
  pant: ["pant", "pants", "trouser", "trousers", "lower", "पैंट", "पॅंट", "पतलून"],
  saree: ["saree", "sari", "साड़ी", "साडी"],
  dress: ["dress", "gown", "frock", "ड्रेस", "गाउन"],
  jacket: ["jacket", "blazer", "coat", "जैकेट", "कोट"],
}

function normalizeText(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function tokenize(input: string) {
  return normalizeText(input).split(" ").filter(Boolean)
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => String(item || "").trim()).filter(Boolean)
}

function levenshtein(a: string, b: string) {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  const dp = Array.from({ length: a.length + 1 }, (_, index) => [index])
  for (let j = 1; j <= b.length; j += 1) dp[0][j] = j
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
    }
  }
  return dp[a.length][b.length]
}

function fuzzyTokenMatch(token: string, corpusTokens: string[]) {
  if (!token) return false
  if (corpusTokens.includes(token)) return true
  for (const candidate of corpusTokens) {
    if (!candidate) continue
    if (candidate.startsWith(token) || token.startsWith(candidate)) return true
    const distance = levenshtein(token, candidate)
    const threshold = token.length <= 4 ? 1 : token.length <= 8 ? 2 : 3
    if (distance <= threshold) return true
  }
  return false
}

function detectIntentAliases(tokens: string[], aliasMap: Record<string, string[]>) {
  const intents = new Set<string>()
  for (const token of tokens) {
    for (const [key, aliases] of Object.entries(aliasMap)) {
      if (aliases.some((alias) => normalizeText(alias) === token)) intents.add(key)
    }
  }
  return intents
}

function getProductCorpus(product: ProductLike) {
  const joined = [
    product.name,
    product.description || "",
    product.category || "",
    product.material || "",
    product.clothType || "",
    product.color || "",
    ...toStringArray(product.colors),
    ...toStringArray(product.tags),
    ...toStringArray(product.highlights),
  ].join(" ")

  return {
    normalized: normalizeText(joined),
    tokens: tokenize(joined),
  }
}

export function scoreProductSearch(product: ProductLike, query: string) {
  const normalizedQuery = normalizeText(query)
  const queryTokens = tokenize(query)
  if (!normalizedQuery || queryTokens.length === 0) return 0

  const corpus = getProductCorpus(product)
  let score = 0

  if (normalizeText(product.name).includes(normalizedQuery)) score += 35
  if ((product.category || "").toLowerCase().includes(normalizedQuery)) score += 15
  if ((product.material || "").toLowerCase().includes(normalizedQuery)) score += 12
  if ((product.clothType || "").toLowerCase().includes(normalizedQuery)) score += 12

  for (const token of queryTokens) {
    if (fuzzyTokenMatch(token, corpus.tokens)) score += 8
  }

  const colorIntent = detectIntentAliases(queryTokens, colorAliases)
  const garmentIntent = detectIntentAliases(queryTokens, garmentAliases)
  const allProductText = corpus.normalized

  if (colorIntent.size > 0) {
    for (const colorKey of colorIntent) {
      if (allProductText.includes(colorKey)) score += 10
    }
  }

  if (garmentIntent.size > 0) {
    for (const garmentKey of garmentIntent) {
      if (allProductText.includes(garmentKey)) score += 10
    }
  }

  return score
}

export function scoreBlogSearch(blog: BlogLike, query: string) {
  const normalizedQuery = normalizeText(query)
  const queryTokens = tokenize(query)
  if (!normalizedQuery || queryTokens.length === 0) return 0

  const corpusText = [blog.title, blog.excerpt || "", blog.category || "", blog.contentHtml || ""].join(" ")
  const corpusTokens = tokenize(corpusText)
  let score = 0

  if (normalizeText(blog.title).includes(normalizedQuery)) score += 30
  if ((blog.category || "").toLowerCase().includes(normalizedQuery)) score += 12
  if ((blog.excerpt || "").toLowerCase().includes(normalizedQuery)) score += 10

  for (const token of queryTokens) {
    if (fuzzyTokenMatch(token, corpusTokens)) score += 6
  }

  return score
}
