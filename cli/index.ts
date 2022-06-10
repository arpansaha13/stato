import { commands } from './commands/index'
import mri from 'mri'

export default function main() {
  const args = mri(process.argv.slice(2))
  const cmd = args._.length === 0 ? 'dev' : args._[0]

  if (cmd === 'dev') {
    commands.dev(args)
  } else if (cmd === 'init') {
    commands.init()
  } else {
    console.warn(`Invalid command ${cmd}`)
  }
}
