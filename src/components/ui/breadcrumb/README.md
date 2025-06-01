# Breadcrumb Component

## Setup Instructions

1. **Copy ReactBits Code**: 
   - Go to [ReactBits Breadcrumb](https://reactbits.dev/components/breadcrumb)
   - Copy the TypeScript code and paste it into `breadcrumb.tsx`
   - Copy the CSS code and paste it into `breadcrumb.css`

2. **Adapt to Glassy Theme**:
   - Replace default classes with our glassy theme classes
   - Use the provided CSS variables and classes
   - Maintain the component's functionality while updating the styling

3. **Test the Component**:
   - Import and use in your app
   - Check all variants and states
   - Ensure it matches the glassy aesthetic

## Glassy Theme Classes Available

- `bg-black/85` - Semi-transparent dark background
- `border-teal-light/15` - Subtle teal border
- `backdrop-blur-lg` - Glass blur effect
- `shadow-xl` - Elevated shadow
- `hover:border-teal-light/25` - Hover border effect

## Usage Example

```tsx
import { Breadcrumb } from './components/ui/breadcrumb';

function App() {
  return (
    <Breadcrumb variant="primary" size="medium">
      Click me
    </Breadcrumb>
  );
}
```
