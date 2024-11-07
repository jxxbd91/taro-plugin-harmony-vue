import * as path from "node:path"
import { HarmonyOS_ArkTS } from "@tarojs/plugin-platform-harmony-ets/dist/index"
import { defaultMainFields, fs, NODE_MODULES, resolveSync } from '@tarojs/helper'
import { parseRelativePath, apiLoader } from './utils'
import runner from './vite-runner'

import type { IPluginContext } from "@tarojs/service"

export default class HarmonyArkTs extends HarmonyOS_ArkTS {
  constructor(ctx: IPluginContext, config: any) {
    super(ctx, config)

    this.resetProp()
  }

  get runtimeVue3FrameworkLibrary() {
    return path.join(__dirname, "./runtime-framework/vue3")
  }

  get runtimeVue3Library() {
    return path.resolve(__dirname, './runtime-ets')
  }

  get runtimeVueRuntimeDom() {
    return path.resolve(__dirname, './vue-runtime-dom')
  }

  get taroRuntime() {
    return path.resolve(__dirname, './taro-runtime')
  }

  protected async getRunner () {
    const compilers = ['vite'] // , 'webpack5'
    const { npm, chalk } = this.helper
    const { appPath } = this.ctx.paths

    if (compilers.indexOf(this.compiler) === -1) {
      const errorChalk = chalk.hex('#f00')

      console.log(errorChalk(`目前 Harmony 平台只支持使用 ${compilers.join(', ')} 编译，请在 config/index.ts 中设置 compiler = ${compilers[0]} 或者 harmony.compiler = ${compilers[0]}`))
      process.exit(0)
    }
    return runner.bind(null, appPath)
  }

  resetProp() {
    this.externalDeps = [
      ['@tarojs/components/types', /^@tarojs[\\/]components[\\/]types/],
      ['@tarojs/components', /^@tarojs[\\/]components([\\/].+)?$/, this.componentLibrary],
      ['@tarojs/runtime', /^@tarojs[\\/]runtime([\\/]ets[\\/].*)?$/, this.runtimeVue3Library],
      ['@tarojs/taro/types', /^@tarojs[\\/]taro[\\/]types/],
      ['@tarojs/taro', /^@tarojs[\\/]taro$/, this.apiLibrary],
      ['@tarojs/plugin-framework-vue3/dist/runtime', /^@tarojs[\\/]plugin-framework-vue3[\\/]dist[\\/]runtime$/, this.runtimeVue3FrameworkLibrary],
      ['vue', /^vue$|vue[\\/]dist[\\/]vue.esm-browser\.js/],
      ['@vue/runtime-dom', /^@vue[\\/]runtime-dom/, this.runtimeVueRuntimeDom],
      ['taro-runtime', /taro-runtime$/, this.taroRuntime],
      ['@vue/reactivity', /^@vue[\\/]reactivity/],
      ['@vue/runtime-core', /^@vue[\\/]runtime-core/],
      ['@vue/shared', /^@vue[\\/]shared/],
    ];
  }

  moveLibraries(lib: string, target = '', basedir = this.ctx.paths.appPath, sync = false) {
    if (!lib) return
    if (this.excludeLibraries.some(e => typeof e === 'string' ? e === lib : e.test(lib))) return

    const { outputRoot, chorePackagePrefix } = this.ctx.runOpts.config
    if (sync) {
      const targetPath = path.join(outputRoot, NODE_MODULES)
      // FIXME 不支持 alias 配置
      const libName = lib
      lib = resolveSync(lib, {
        basedir,
        extensions: this.extensions,
        mainFields: defaultMainFields,
        preserveSymlinks: false,
      }) || ''
      // Note: 跳过 node 相关或未能找到的依赖
      if (!lib || !path.isAbsolute(lib)) {
        return this.removeFromLibraries(libName)
      }
      let ext = path.extname(lib)
      const libDir = lib.replace(/.*[\\/]node_modules[\\/]/, '')
      const basename = path.basename(lib, ext)
      if (['.cjs', '.mjs'].includes(ext)) {
        ext = '.js'
      } else if (ext === '.mts') {
        ext = '.ts'
      }

      if (ext === '.js') {
        let typeName = `@types/${libName.replace('@', '').replace(/\//g, '__')}`
        let typePath = resolveSync(typeName, {
          basedir,
          extensions: this.extensions,
          mainFields: [...defaultMainFields],
          preserveSymlinks: false,
        })
        if (!typePath) {
          typeName = path.join(path.dirname(lib), `${basename}.d.ts`)
          typePath = resolveSync(typeName, {
            basedir,
            extensions: this.extensions,
            mainFields: [...defaultMainFields],
            preserveSymlinks: false,
          })
        }
        if (typePath) {
          this.moveLibraries(
            typePath,
            path.extname(target)
              ? path.join(path.dirname(target), `${basename}.d.ts`)
              : path.join(target, `index.d.ts`),
            basedir
          )
        }
      }

      if (ext) {
        const code = fs.readFileSync(lib, { encoding: 'utf8' })
        if (
          (/(?:import\s|from\s|require\()['"]([\\/.][^'"\s]+)['"]\)?/g.test(code) ||
          /\/{3}\s<reference\spath=['"][^'"\s]+['"]\s\/>/g.test(code)) &&
          `${libName}${path.extname(libDir)}` !== libDir
        ) {
          // Note: 文件包含包内引用的依赖
          const pkgPath = path.relative(libName, libDir)
          if (new RegExp(`^index(${this.extensions.map(e => e.replace('.', '\\.')).join('|')})$`).test(pkgPath)) {
            // Note: 入口为 index 场景
            lib = path.dirname(lib)
          } else if (!/[\\/]/.test(pkgPath)) {
            // FIXME: 非 index 入口文件场景，可能存在入口文件引用 index 但该文件被覆盖的情况，需要额外处理
            const isDTS = /\.d\.ts$/.test(target)
            target = path.join(target, `index${isDTS ? '.d.ts' : ext}`)
          } else {
            // FIXME 多级目录，可能存在入口不为 index 或者引用一级目录文件的情况，需要额外处理
            const dir = path.dirname(pkgPath)
            if (libDir.includes(NODE_MODULES)) {
              target = path.join(target, dir)
            }
            lib = path.dirname(lib)
          }
        } else if (path.isAbsolute(libDir)) {
          // Note: 本地 link 的依赖
          const isDTS = /\.d\.ts$/.test(target)
          target = path.extname(target)
            ? path.join(path.dirname(target), `${basename}${ext}`)
            : path.join(target, `index${isDTS ? '.d.ts' : ext}`)
        } else {
          const libPath = path.relative(targetPath, target)
          if (libDir !== libPath) {
            if (path.relative(libPath, libDir).startsWith('.')) {
              target = path.join(targetPath, libDir)
            } else {
              target = path.join(targetPath, libName, `index${ext}`)
            }
          }
        }
      }
    }

    const stat = fs.lstatSync(lib)
    if (stat.isDirectory()) {
      const files = fs.readdirSync(lib)
      files.forEach((file) => {
        if (![NODE_MODULES].includes(file)) {
          this.moveLibraries(path.join(lib, file), path.join(target, file))
        }
      })
    } else if (stat.isFile()) {
      let code = fs.readFileSync(lib, { encoding: 'utf8' })
      if (this.apiEntry.some(e => e.test(lib))) {
        code = apiLoader(code)
      }
      if (this.extensions.includes(path.extname(lib))) {
        // Note: 移除 onpm 不能装载的类型，新版本会导致 ets-loader 抛出 resolvedFileName 异常
        code = code.replace(/\/{3}\s*<reference\s+types=['"]([^'"\s]+)['"]\s*\/>\n*/g, '')
        // Note: 查询 externals 内的依赖，并将它们添加到 externalDeps 中
        code = code.replace(/(?:import\s|from\s|require\()['"]([^\\/.][^'"\s]+)['"]\)?/g, (src, p1 = '') => {
          if (p1.startsWith('node:') || p1.endsWith('.so')) return src

          const { outputRoot } = this.ctx.runOpts.config
          const targetPath = path.join(outputRoot, NODE_MODULES, p1)
          const relativePath = parseRelativePath(path.dirname(target), targetPath)
          if (this.harmonyScope.every(e => !e.test(p1))) {
            if (this.indexOfLibraries(p1) === -1 && !/\.(d\.ts|flow\.js)$/.test(lib)) {
              this.externalDeps.push([p1, new RegExp(`^${p1.replace(/([-\\/$])/g, '\\$1')}$`)])
              this.moveLibraries(p1, targetPath, path.dirname(lib), true)
            }
            return src.replace(p1, relativePath.replace(new RegExp(`\\b${NODE_MODULES}\\b`), 'npm'))
          }

          return src
        })

        const define: Record<string, string> = {
          ...this.defineConstants,
          // Note: React 开发环境可能调用 stack 可能导致 appWrapper 实例变更
          'ReactDebugCurrentFrame.getCurrentStack': 'ReactDebugCurrentFrame.getCurrentStack$',
        }
        if ([/(@tarojs[\\/]runtime|taro-runtime)[\\/]dist/].some(e => e.test(lib))) {
          define.global = 'globalThis'
        }
        const ext = path.extname(target)
        if (![/d\.e?tsx?$/, /\.(json|map|md)$/].some(e => e.test(target))) {
          code = this.replaceDefineValue(code, define, ext)
        }
        if (['.ts'].includes(ext)) {
          code = '// @ts-nocheck\n' + code
        }

        // 处理嵌套样式的编译，需要针对ReactElement进行props操作，dev模式下会Object.freeze，所以需要在开发模式下注入Object.freeze来覆盖解锁
        // 处理的方法再taro-platform-harmony/src/runtime-ets/dom/cssNesting: ele.props.style = declaration
        if (/react\/jsx-runtime/.test(lib) && process.env.NODE_ENV === 'development') {
          code = 'Object.freeze = (obj) => obj \n' + code
        }
      }

      // Note: 传入 chorePackagePrefix 时，不生成核心依赖库
      if (!chorePackagePrefix) {
        if (/tarojs[\\/]taro[\\/]types[\\/]index.d.ts/.test(target)) {
          code = `/// <reference path="global.d.ts" />

/// <reference path="taro.api.d.ts" />
/// <reference path="taro.component.d.ts" />
/// <reference path="taro.config.d.ts" />
/// <reference path="taro.lifecycle.d.ts" />

export = Taro
export as namespace Taro

declare const Taro: Taro.TaroStatic

declare namespace Taro {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface TaroStatic {}
}
declare global {
  const defineAppConfig: (config: Taro.Config) => Taro.Config
  const definePageConfig: (config: Taro.Config) => Taro.Config
}`
        }
        try {
          const targetPath = target.replace(new RegExp(`\\b${NODE_MODULES}\\b`), 'npm')
          fs.ensureDirSync(path.dirname(targetPath))
          fs.writeFileSync(targetPath, code)
        } catch (e) {
          console.error(`[taro-arkts] inject ${lib} to ${target} failed`, e)
        }
      }
    } else if (stat.isSymbolicLink()) {
      const realPath = fs.realpathSync(lib, { encoding: 'utf8' })
      this.moveLibraries(realPath, target, basedir)
    }
  }
}
