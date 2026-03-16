<template>
  <div class="interactive-modals">
    <!-- Context Review Modal -->
    <ContextReviewModal
      v-if="aiStore.activeModal === 'context-scan'"
      :visible="true"
      :data="aiStore.pendingConfirm?.data"
      @confirm="handleConfirm()"
      @abort="handleAbort()"
    />

    <!-- Prompt Review Modal -->
    <PromptReviewModal
      v-if="aiStore.activeModal === 'prompt-build'"
      :visible="true"
      :data="aiStore.pendingConfirm?.data"
      @send="handleConfirm($event)"
      @abort="handleAbort()"
    />

    <!-- LLM Response Modal -->
    <LlmResponseModal
      v-if="aiStore.activeModal === 'llm-call'"
      :visible="true"
      :data="aiStore.pendingConfirm?.data"
      @confirm="handleConfirm()"
      @retry="handleRetry()"
      @abort="handleAbort()"
    />

    <!-- Code Review Modal -->
    <CodeReviewModal
      v-if="aiStore.activeModal === 'post-process'"
      :visible="true"
      :data="aiStore.pendingConfirm?.data"
      @accept="handleConfirm($event)"
      @abort="handleAbort()"
    />

    <!-- Write Confirm Modal -->
    <WriteConfirmModal
      v-if="aiStore.activeModal === 'file-write'"
      :visible="true"
      :data="aiStore.pendingConfirm?.data"
      @confirm="handleConfirm($event)"
      @abort="handleAbort()"
    />

    <!-- Step Error Modal -->
    <StepErrorModal
      v-if="aiStore.activeModal === 'error'"
      :visible="true"
      :data="aiStore.pendingConfirm?.data"
      @retry="handleRetry()"
      @skip="handleConfirm()"
      @abort="handleAbort()"
    />
  </div>
</template>

<script setup lang="ts">
import { useAiStore } from '../../stores/ai.store';
import { useInteractiveSession } from '../../composables/useInteractiveSession';
import ContextReviewModal from './modals/ContextReviewModal.vue';
import PromptReviewModal from './modals/PromptReviewModal.vue';
import LlmResponseModal from './modals/LlmResponseModal.vue';
import CodeReviewModal from './modals/CodeReviewModal.vue';
import WriteConfirmModal from './modals/WriteConfirmModal.vue';
import StepErrorModal from './modals/StepErrorModal.vue';

const aiStore = useAiStore();
const { confirmStep, retryStep, abortSession } = useInteractiveSession();

function handleConfirm(editedData?: Record<string, any>) {
  if (aiStore.pendingConfirm) {
    confirmStep(aiStore.pendingConfirm.stepId, editedData);
  }
}

function handleRetry() {
  if (aiStore.pendingConfirm) {
    retryStep(aiStore.pendingConfirm.stepId);
  }
}

function handleAbort() {
  abortSession();
}
</script>

<style scoped>
.interactive-modals { position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 9999; }
</style>
