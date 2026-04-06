<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import cursesJson from './public/curses.json'

// Définir l'interface pour la structure des données
interface CurseCategory {
  curses: string[];
}

// Jurons embarqués au build (évite fetch + boucles de rechargement en dev/SSR)
const curses = ref<Record<string, CurseCategory>>(
  cursesJson as Record<string, CurseCategory>
)
// Texte du juron (saisi ou tiré au hasard)
const curseText = ref<string>('')
const CURSE_IMAGE_SRC = '/curses-capitaine-haddock-on-pirates.webp'
const isDownloading = ref(false)
const isCopying = ref(false)
const copied = ref(false)
let copyFeedbackTimer: ReturnType<typeof setTimeout> | undefined

const curseDisplayText = computed(() => {
  const t = curseText.value.trim()
  return t ? `${t}... !` : ''
})

function copyTextFallback(text: string) {
  const ta = document.createElement('textarea')
  ta.value = text
  ta.setAttribute('readonly', '')
  ta.style.position = 'fixed'
  ta.style.left = '-9999px'
  document.body.appendChild(ta)
  ta.select()
  document.execCommand('copy')
  document.body.removeChild(ta)
}

async function renderCurseCompositePng(): Promise<Blob | null> {
  const fullText = curseDisplayText.value
  if (!fullText) return null

  const img = new Image()
  img.decoding = 'async'
  img.src = CURSE_IMAGE_SRC
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('Image introuvable'))
  })

  const w = img.naturalWidth
  const h = img.naturalHeight
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.drawImage(img, 0, 0)

  const maxTextWidth = w * 0.9
  const fontSize = Math.max(14, Math.round(w * 0.045))
  ctx.font = `bold ${fontSize}px ui-sans-serif, system-ui, sans-serif`
  ctx.fillStyle = '#000000'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'

  const lines = wrapCanvasText(ctx, fullText, maxTextWidth)
  const lineHeight = fontSize * 1.25
  let y = h * 0.05

  for (const line of lines) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)'
    ctx.shadowBlur = 6
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 1
    ctx.fillText(line, w / 2, y)
    y += lineHeight
  }

  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
}

const copyCurseToClipboard = async () => {
  const text = curseDisplayText.value
  if (!text || isCopying.value) return
  isCopying.value = true
  try {
    const pngBlob = await renderCurseCompositePng()
    if (!pngBlob) throw new Error('Image vide')

    const canWriteRich =
      typeof ClipboardItem !== 'undefined' &&
      typeof navigator.clipboard?.write === 'function'

    if (canWriteRich) {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/plain': Promise.resolve(
            new Blob([text], { type: 'text/plain' })
          ),
          'image/png': Promise.resolve(pngBlob),
        }),
      ])
    } else {
      await navigator.clipboard.writeText(text)
    }
    copied.value = true
    if (copyFeedbackTimer) clearTimeout(copyFeedbackTimer)
    copyFeedbackTimer = setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (e) {
    console.error('Copie riche impossible, repli texte :', e)
    try {
      await navigator.clipboard.writeText(text)
      copied.value = true
      if (copyFeedbackTimer) clearTimeout(copyFeedbackTimer)
      copyFeedbackTimer = setTimeout(() => {
        copied.value = false
      }, 2000)
    } catch {
      copyTextFallback(text)
      copied.value = true
      if (copyFeedbackTimer) clearTimeout(copyFeedbackTimer)
      copyFeedbackTimer = setTimeout(() => {
        copied.value = false
      }, 2000)
    }
  } finally {
    isCopying.value = false
  }
}

watch(curseText, () => {
  copied.value = false
})

// Répertoire (curses.json) : recherche + affichage par lettre
const curseSearchQuery = ref('')

const curseEntriesByLetter = computed(() => {
  const data = curses.value
  const letters = Object.keys(data).sort((a, b) => a.localeCompare(b, 'fr'))
  return letters.map((letter) => ({
    letter,
    curses: data[letter].curses,
  }))
})

const filteredCurseEntries = computed(() => {
  const q = curseSearchQuery.value.trim().toLowerCase()
  if (!q) {
    return curseEntriesByLetter.value
  }
  return curseEntriesByLetter.value
    .map((g) => ({
      letter: g.letter,
      curses: g.curses.filter((c) => c.toLowerCase().includes(q)),
    }))
    .filter((g) => g.curses.length > 0)
})

const totalFilteredCount = computed(() =>
  filteredCurseEntries.value.reduce((n, g) => n + g.curses.length, 0)
)

function selectCurseFromList(text: string) {
  curseText.value = text
}

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/)
  if (words.length === 0) return []
  const lines: string[] = []
  let line = words[0]!
  for (let i = 1; i < words.length; i++) {
    const word = words[i]!
    const test = `${line} ${word}`
    if (ctx.measureText(test).width > maxWidth && line.length > 0) {
      lines.push(line)
      line = word
    } else {
      line = test
    }
  }
  lines.push(line)
  return lines
}

const downloadCurseImage = async () => {
  if (!curseText.value.trim() || isDownloading.value) return
  isDownloading.value = true
  try {
    const blob = await renderCurseCompositePng()
    if (!blob) return

    const url = URL.createObjectURL(blob)
    const safeSlug = curseText.value
      .slice(0, 40)
      .replace(/[^\wÀ-ÿ\s-]/gu, '')
      .trim()
      .replace(/\s+/g, '-')
      .toLowerCase()
    const a = document.createElement('a')
    a.href = url
    a.download = `haddock-${safeSlug || 'juron'}.png`
    a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    console.error('Téléchargement impossible:', e)
  } finally {
    isDownloading.value = false
  }
}

// Fonction pour obtenir un juron aléatoire
const getRandomCurse = () => {
  const loadedCurses = curses.value
  const categories = Object.keys(loadedCurses)
  if (categories.length === 0) return

  for (let attempt = 0; attempt < 64; attempt++) {
    const randomCategoryKey =
      categories[Math.floor(Math.random() * categories.length)]!
    const categoryCurses = loadedCurses[randomCategoryKey].curses
    if (categoryCurses.length === 0) continue

    const randomIndex = Math.floor(Math.random() * categoryCurses.length)
    curseText.value = categoryCurses[randomIndex]!
    return
  }
}

// Gestionnaire pour l'événement keydown (J = aléatoire, sauf si on saisit du texte)
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key.toLowerCase() !== 'j') return
  const el = event.target as HTMLElement | null
  if (
    el &&
    (el.tagName === 'INPUT' ||
      el.tagName === 'TEXTAREA' ||
      el.isContentEditable)
  ) {
    return
  }
  getRandomCurse()
}

// Attacher/Détacher l'écouteur d'événements
onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
  if (copyFeedbackTimer) clearTimeout(copyFeedbackTimer);
});

</script>
<template>
  <div class="min-h-screen bg-gray-50 font-sans dark:bg-gray-900">
    <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 class="mb-2 text-center text-3xl font-bold text-gray-900 sm:text-4xl dark:text-white">
        La fury de Haddock
      </h1>
      <p class="mb-10 text-center text-lg text-gray-500 sm:text-xl dark:text-gray-400">
        Générateur de jurons du Capitaine Haddock
      </p>

      <div
        class="flex flex-col items-stretch gap-10 lg:flex-row lg:items-start lg:justify-center lg:gap-12"
      >
        <!-- Colonne gauche : générateur -->
        <div class="mx-auto flex w-full max-w-lg flex-col items-center lg:mx-0">
          <UButton size="xl" class="mb-8 sm:mb-10" @click="getRandomCurse">
            Juron Aléatoire !
          </UButton>

          <p class="mb-4 max-w-lg text-center text-gray-500 sm:mb-6 dark:text-gray-400">
            Saisissez votre juron sur l’image, ou appuyez sur la touche « J » (hors champ de saisie) pour en tirer un au hasard.
          </p>

          <Transition name="appear" appear>
            <div class="relative w-full">
              <img
                :src="CURSE_IMAGE_SRC"
                alt="Tournesol criant un juron"
                class="h-auto w-full rounded-lg shadow-md"
              />
              <UTextarea
                id="curse-input"
                v-model="curseText"
                placeholder="Ex. Tonnerre de Brest"
                :rows="2"
                autoresize
                :maxlength="500"
                color="neutral"
                variant="none"
                class="absolute top-2 z-10 w-full max-w-[calc(100%-16px)] -translate-x-1/2 text-center text-black md:h-24
                       text-base font-bold sm:text-xl lg:text-2xl left-1/2
                       rounded-md border-0
                       focus:ring-2 focus:ring-primary-500"
                :ui="{
                  root: 'bg-white',
                  base: 'resize-none min-h-[4.5rem] border-none bg-white py-2 text-center text-pretty text-gray-900 placeholder:font-normal placeholder:text-gray-500 sm:py-3',
                }"
              />
              <div
                v-if="curseDisplayText"
                class="mt-4 flex flex-wrap justify-center gap-3"
              >
                <UButton
                  color="neutral"
                  variant="outline"
                  size="lg"
                  :loading="isCopying"
                  @click="copyCurseToClipboard"
                >
                  {{ copied ? 'Copié !' : 'Copier le juron et l’image' }}
                </UButton>
                <UButton
                  color="neutral"
                  variant="outline"
                  size="lg"
                  :loading="isDownloading"
                  @click="downloadCurseImage"
                >
                  Télécharger l’image avec le juron
                </UButton>
              </div>
            </div>
          </Transition>
        </div>

        <!-- Colonne droite : répertoire curses.json -->
        <aside
          class="w-full shrink-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800/80 lg:sticky lg:top-8 lg:max-h-[calc(100vh-4rem)] lg:w-[min(100%,22rem)] xl:w-[min(100%,26rem)]"
        >
          <h2 class="mb-3 text-base font-semibold text-gray-900 dark:text-white">
            Répertoire des jurons
          </h2>
          <p class="mb-2 text-xs dark:text-gray-400">
            Données issues de <a class="rounded bg-gray-100 px-1 dark:bg-gray-900 cursor-pointer text-green-400" href="https://tintin.fandom.com/fr/wiki/Liste_des_jurons_du_capitaine_Haddock" target="_BLANCK">tintin.fandom</a>
          </p>
          <UInput
            v-model="curseSearchQuery"
            type="search"
            placeholder="Rechercher un juron…"
            icon="i-lucide-search"
            class="w-full"
            size="md"
          />
          <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {{ totalFilteredCount }} juron{{ totalFilteredCount !== 1 ? 's' : '' }}
            <span v-if="curseSearchQuery.trim()"> (filtrés)</span>
          </p>
          <div
            class="mt-3 max-h-[min(50vh,24rem)] overflow-y-auto pr-1 lg:max-h-[min(70vh,32rem)]"
          >
            <template v-if="filteredCurseEntries.length === 0">
              <p class="text-sm text-gray-500 dark:text-gray-400">
                Aucun juron ne correspond à « {{ curseSearchQuery }} ».
              </p>
            </template>
            <ul v-else class="space-y-4">
              <li v-for="group in filteredCurseEntries" :key="group.letter">
                <h3
                  class="mb-1.5 text-xs font-bold uppercase tracking-wide text-primary-600 dark:text-primary-400"
                >
                  Lettre {{ group.letter }}
                </h3>
                <ul class="space-y-0.5 border-l-2 border-gray-200 pl-2 dark:border-gray-600">
                  <li v-for="c in group.curses" :key="`${group.letter}-${c}`">
                    <button
                      type="button"
                      class="w-full rounded px-1 py-0.5 text-left text-sm text-gray-800 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700/80"
                      @click="selectCurseFromList(c)"
                    >
                      {{ c }}
                    </button>
                  </li>
                </ul>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  </div>
</template>

<style>
/* Transition pour l'apparition de l'image/texte */
.appear-enter-active,
.appear-leave-active {
  transition: opacity 0.5s ease, transform 0.5s ease;
}

.appear-enter-from,
.appear-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
