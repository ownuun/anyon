import { AnyonWebCompanion as Component } from './AnyonWebCompanion.js'

export const AnyonWebCompanion =
  process.env.NODE_ENV === 'development' ? Component : () => null
