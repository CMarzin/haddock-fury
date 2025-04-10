<script setup lang="ts">
import { ref, onBeforeMount, onMounted, onUnmounted } from 'vue'

// Définir l'interface pour la structure des données
interface CurseCategory {
  curses: string[];
}

// Variable réactive pour stocker les jurons chargés
const curses = ref<Record<string, CurseCategory>>({});
// Indicateur de chargement
const isLoading = ref(true);
// Variable réactive pour le juron aléatoire
const randomCurse = ref<string>('')

// Charger les données avant le montage
onBeforeMount(async () => {
  try {
    const response = await fetch('/curses.json') // Charger depuis le dossier public
    if (!response.ok) {
      throw new Error('Failed to fetch curses');
    }
    curses.value = await response.json();
  } catch (error) {
    console.error("Erreur lors du chargement des jurons:", error);
    // Gérer l'erreur (par exemple, afficher un message à l'utilisateur)
  } finally {
    isLoading.value = false; // Fin du chargement
  }
});

// Fonction pour obtenir un juron aléatoire
const getRandomCurse = () => {
  // Vérifier si les données sont chargées
  const loadedCurses = curses.value;
  const categories = Object.keys(loadedCurses);
  if (categories.length === 0) return; // Sécurité si vide ou pas encore chargé

  // Choisir une catégorie aléatoire
  const randomCategoryKey = categories[Math.floor(Math.random() * categories.length)];
  const categoryCurses = loadedCurses[randomCategoryKey].curses;

  if (categoryCurses.length === 0) {
    // Simple récursion si la catégorie est vide
    getRandomCurse();
    return;
  }

  // Choisir un juron aléatoire dans la catégorie
  const randomIndex = Math.floor(Math.random() * categoryCurses.length);
  randomCurse.value = categoryCurses[randomIndex];
}

// Gestionnaire pour l'événement keydown
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key.toLowerCase() === 'j') {
    getRandomCurse();
  }
};

// Attacher/Détacher l'écouteur d'événements
onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});

</script>
<template>
  <div class="bg-gray-50 dark:bg-gray-900 min-h-screen font-sans p-8 flex flex-col items-center justify-center">
    <h1 class="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2 text-center">La fury de Haddock</h1>
    <p class="text-lg sm:text-xl text-gray-500 dark:text-gray-400 mb-8 sm:mb-10 text-center">Générateur de jurons du
      Capitaine Haddock</p>

    <!-- Bouton -->
    <UButton @click="getRandomCurse" size="xl" class="mb-8 sm:mb-10" :disabled="isLoading" :loading="isLoading">
      {{ isLoading ? 'Chargement...' : 'Juron Aléatoire !' }}
    </UButton>

    <p class="text-gray-500 dark:text-gray-400 mb-8 sm:mb-10 text-center">Appuyez sur la touche "J" pour générer un juron aléatoire</p>

    <!-- Animation d'apparition pour l'image et le texte -->
    <Transition name="appear" appear>
      <div v-if="randomCurse" class="relative w-full max-w-lg">
        <img
          src="/curses-capitaine-haddock-on-pirates.webp"
          alt="Tournesol criant un juron"
          class="rounded-lg shadow-md w-full h-auto"
        />
        <!-- Transition de fondu pour le texte -->
        <Transition name="fade" mode="out-in">
          <p
            :key="randomCurse"
            class="absolute top-[10%] left-1/2 -translate-x-1/2 
                     text-black text-xl sm:text-2xl font-bold text-center 
                     rounded drop-shadow-lg"
          >
            {{ randomCurse }}... !
          </p>
        </Transition>
      </div>
    </Transition>

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

/* Transition de fondu pour le texte */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
