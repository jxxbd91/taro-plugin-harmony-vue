import * as path from "node:path"

import HarmonyArkTs from "./HarmonyArkTs"
import { chalk } from '@tarojs/helper'
import { PLATFORM_NAME } from "./utils"

import type { IPluginContext } from "@tarojs/service"
import type { IHarmonyConfig } from '@tarojs/taro/types/compile'

export default (ctx: IPluginContext) => {
  // 合并 harmony 编译配置到 opts
  ctx.modifyRunnerOpts(({ opts }) => {
    if (opts.platform !== PLATFORM_NAME) return

    const harmonyConfig = ctx.ctx.initialConfig.harmony
    assertHarmonyConfig(ctx, harmonyConfig)

    harmonyConfig.name ||= 'default'
    harmonyConfig.hapName ||= 'entry'
    const { projectPath, hapName } = harmonyConfig
    opts.outputRoot = path.join(projectPath, hapName, 'src/main', 'ets')
    opts.harmony = harmonyConfig
    ctx.paths.outputPath = opts.outputRoot
  })

  ctx.registerPlatform({
    name: PLATFORM_NAME,
    useConfigName: PLATFORM_NAME,
    async fn ({ config }) {
      const program = new HarmonyArkTs(ctx, config)
      await program.start()
    }
  })
}


function assertHarmonyConfig (ctx: IPluginContext, config): asserts config is IHarmonyConfig {
  const NOTE_INVALID = chalk.red('[✗] ')
  const errorChalk = chalk.hex('#f00')
  const lineChalk = chalk.hex('#fff')

  function throwError (err) {
    console.log(errorChalk(`Taro 配置有误，请检查！ (${ctx.paths.configPath})`))
    console.log(`  ${NOTE_INVALID}${lineChalk(err)}`)
    process.exit(0)
  }

  if (typeof config !== 'object' || !config) {
    throwError('请设置 harmony 编译配置')
  }

  if (!config.projectPath) {
    throwError('请设置 harmony.projectPath')
  }
}