const app = new Map<string, any>();

export const set = (key: string, value: any) => {
  app.set(key, value)
}

export const get = (key: string) => app.get(key)

export const getSvgElement = () => {
  const TaroElement = app.get('TaroElement')
  class SvgElement extends TaroElement {}

  return SvgElement;
}