import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

// Simple test component
function TestComponent({ message = 'Hello World' }) {
  return <div data-testid="test-component">{message}</div>
}

describe('Simple Test Setup Validation', () => {
  it('should render a simple component', () => {
    render(<TestComponent />)
    
    const component = screen.getByTestId('test-component')
    expect(component).toBeInTheDocument()
    expect(component).toHaveTextContent('Hello World')
  })

  it('should render with custom message', () => {
    render(<TestComponent message="Testing Works!" />)
    
    const component = screen.getByTestId('test-component')
    expect(component).toHaveTextContent('Testing Works!')
  })

  it('should handle basic interactions', () => {
    const { rerender } = render(<TestComponent message="Initial" />)
    
    let component = screen.getByTestId('test-component')
    expect(component).toHaveTextContent('Initial')
    
    rerender(<TestComponent message="Updated" />)
    
    component = screen.getByTestId('test-component')
    expect(component).toHaveTextContent('Updated')
  })
})