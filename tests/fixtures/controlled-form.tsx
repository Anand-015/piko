import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'

function ControlledForm() {
  const [answer, setAnswer] = useState('')
  const [fixed] = useState('Original')
  return <form onSubmit={(event) => { event.preventDefault(); window.fixtureEvents.submit++ }}>
    <label>React answer<input id="react-answer" value={answer} onChange={(event) => setAnswer(event.target.value)} /></label>
    <label>React fixed answer<input id="react-fixed" value={fixed} onChange={() => {}} /></label>
    <output id="react-state">{answer}</output>
    <button type="submit">Submit fixture</button>
  </form>
}
createRoot(document.getElementById('react-root')!).render(<ControlledForm />)
