import React from 'react'
import './App.css'

import Editor, { RQValue } from './components/RQEditor'

const ExampleObj: RQValue | undefined = undefined

function App(): JSX.Element {
    const [obj, updateObj] = React.useState(ExampleObj)
    return (
        <div className="App">
            {<Editor key='rq#1' object={obj} onChange={updateObj} />}
        </div>
    )
}

export default App
