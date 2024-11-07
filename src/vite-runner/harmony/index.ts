import multiPlatformPlugin from '@tarojs/vite-runner/dist/common/multi-platform-plugin'
// import multiPlatformPlugin from '../common/multi-platform-plugin'
import { assetPlugin } from '@tarojs/vite-runner/dist/harmony/asset'
import importPlugin from './babel'
import { compileModePrePlugin } from '@tarojs/vite-runner/dist/harmony/compile'
import configPlugin from '@tarojs/vite-runner/dist/harmony/config'
import emitPlugin from '@tarojs/vite-runner/dist/harmony/emit'
import entryPlugin from '@tarojs/vite-runner/dist/harmony/entry'
import etsPlugin from '@tarojs/vite-runner/dist/harmony/ets'
import pagePlugin from '@tarojs/vite-runner/dist/harmony/page'
import pipelinePlugin from '@tarojs/vite-runner/dist/harmony/pipeline'
import { stylePlugin, stylePostPlugin } from './style'

import type { ViteHarmonyCompilerContext } from '@tarojs/taro/types/compile/viteCompilerContext'
import type { UserConfig } from 'vite'

export default function (viteCompilerContext: ViteHarmonyCompilerContext): UserConfig['plugins'] {
  return [
    pipelinePlugin(viteCompilerContext),
    configPlugin(viteCompilerContext),
    stylePlugin(viteCompilerContext),
    compileModePrePlugin(viteCompilerContext),
    assetPlugin(viteCompilerContext),
    entryPlugin(viteCompilerContext),
    pagePlugin(viteCompilerContext),
    etsPlugin(viteCompilerContext),
    multiPlatformPlugin(viteCompilerContext),
    emitPlugin(viteCompilerContext),
    importPlugin(viteCompilerContext),
    stylePostPlugin(viteCompilerContext),
  ]
}
