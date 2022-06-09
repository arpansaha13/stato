<template>
  <div class="container">
    <aside ref="target" class="sidebar" :style="style">
      <Disclosure
        as="ul"
        v-for="[bookName, storyNames] in sidebarMap"
        :key="bookName"
        class="disclosure"
      >
        <DisclosureButton class="disclosure-button">
          {{ bookName }}
        </DisclosureButton>
        <DisclosurePanel class="disclosure-panel">
          <li
            v-for="story in storyNames"
            :key="story"
            :class="[
              'disclosure-panel-item',
              activeStoryMapKey === `${bookName}/${story}`
                ? 'disclosure-panel-item-active'
                : '',
            ]"
          >
            <button @click="selectStory(bookName, story)">
              {{ sentenceCase(story) }}
            </button>
          </li>
        </DisclosurePanel>
      </Disclosure>
    </aside>
    <main class="workspace">
      <div ref="handler" class="resize-handle" />
      <div v-if="iframeURL !== null" class="screen">
        <iframe
          :src="iframeURL"
          id="stato-iframe"
          title="Stato iframe for rendering stories in isolation"
        />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useHResize } from '../composables/useHResize'
import { useWsOn, useWsSend } from '../composables/useWs'
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/vue'
import { sentenceCase } from 'change-case'

import type { PropType } from 'vue'
import type { IframeEnv } from '../../types'

defineProps({
  sidebarMap: {
    type: Map as PropType<Map<string, string[]>>,
    required: true,
  },
})

const activeStoryMapKey = ref('')
const iframeURL = ref<string | null>(null)

useWsOn('stato-main:iframe-env', (iframeEnv: IframeEnv) => {
  iframeURL.value = `http://${iframeEnv.IFRAME_SERVER_HOST}:${iframeEnv.IFRAME_SERVER_PORT}`
})

function selectStory(book: string, story: string) {
  return () => {
    activeStoryMapKey.value = `${book}/${story}`
    useWsSend('stato-main:select-story', `${book}/${story}`)
  }
}

const style = useHResize(
  'target',
  { ref: 'handler', direction: 'normal' },
  { min: '6rem', initial: '16rem', max: '32rem' }
)
</script>
