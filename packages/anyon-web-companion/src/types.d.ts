export { AnyonWebCompanion } from './AnyonWebCompanion'

export type Editor = 'vscode' | 'vscode-insiders' | 'cursor' | string

export type PathModifier = (path: string) => string

export type AnyonWebCompanionProps = {
  editor?: Editor
  pathModifier?: PathModifier
}

export type Coords = [MouseEvent['pageX'], MouseEvent['pageY']]

export type Target = HTMLElement
