import React from 'react'
import ReactDOM from 'react-dom/client'
import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import App from './App.tsx'
import { BoulderConfigProvider } from './context/BoulderConfigContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ChakraProvider value={defaultSystem}>
    <BoulderConfigProvider>
      <App />
    </BoulderConfigProvider>
  </ChakraProvider>
) 