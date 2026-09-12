import './style.css'
import { renderAppShell } from './shell'

const app = document.querySelector<HTMLDivElement>('#app')

if (!app) {
  throw new Error('Application root was not found')
}

app.innerHTML = renderAppShell()
