<script setup lang="ts">
import { NIcon } from 'naive-ui'
import type { Component } from 'vue'
import {
  AddOutline, AlertCircleOutline, BuildOutline, ChatbubbleOutline,
  CheckmarkCircleOutline, CheckmarkOutline, ChevronDownOutline,
  ChevronUpOutline, ChevronForwardOutline, CloseCircleOutline,
  CloseOutline, CloudDownloadOutline, CloudUploadOutline,
  CopyOutline, CreateOutline, DocumentOutline, DownloadOutline,
  EyeOffOutline, EyeOutline, FolderOpenOutline, FunnelOutline,
  GlobeOutline, HelpCircleOutline, InformationCircleOutline,
  ListOutline, LockClosedOutline, OpenOutline, PowerOutline,
  ReorderThreeOutline, SaveOutline, SearchOutline, SettingsOutline,
  ShareSocialOutline, SwapHorizontalOutline, TrashOutline,
  WarningOutline,
} from '@vicons/ionicons5'

const props = defineProps<{
  name: string
  color?: string
}>()

const iconMap: Record<string, Component> = {
  'alert': AlertCircleOutline,
  'chevron-down': ChevronDownOutline,
  'chevron-right': ChevronForwardOutline,
  'chevron-up': ChevronUpOutline,
  'cloud-download': CloudDownloadOutline,
  'cloud-upload': CloudUploadOutline,
  'cog': SettingsOutline,
  'comment': ChatbubbleOutline,
  'danger': CloseOutline,
  'download-alt': DownloadOutline,
  'download': DownloadOutline,
  'duplicate': CopyOutline,
  'edit': CreateOutline,
  'erase': CloseCircleOutline,
  'eye-close': EyeOffOutline,
  'eye-open': EyeOutline,
  'file': DocumentOutline,
  'filter': FunnelOutline,
  'floppy-save': SaveOutline,
  'folder-open': FolderOpenOutline,
  'globe': GlobeOutline,
  'info-sign': InformationCircleOutline,
  'list': ListOutline,
  'lock': LockClosedOutline,
  'new-window': OpenOutline,
  'off': PowerOutline,
  'ok-circle': CheckmarkCircleOutline,
  'ok': CheckmarkOutline,
  'plus': AddOutline,
  'question-sign': HelpCircleOutline,
  'remove-circle': CloseCircleOutline,
  'remove-sign': CloseCircleOutline,
  'remove': CloseOutline,
  'retweet': SwapHorizontalOutline,
  'search': SearchOutline,
  'share-alt': ShareSocialOutline,
  'sort': ReorderThreeOutline,
  'transfer': SwapHorizontalOutline,
  'trash': TrashOutline,
  'warning-sign': WarningOutline,
  'wrench': BuildOutline,
}

const resolvedName = props.name.startsWith('glyphicon-')
  ? props.name.slice('glyphicon-'.length)
  : props.name
const iconComponent = iconMap[resolvedName] ?? HelpCircleOutline
</script>

<template>
  <NIcon
    :color="color"
    :component="iconComponent"
  />
</template>
