# Frontend Modernization - Quick Start Guide

## 🎨 New Design System

### Color Palette (Mobile-Aligned)
```css
--color-primary: #0E3B4C;        /* Dark Teal - Main brand */
--color-secondary: #57B8CB;      /* Light Teal - Accent */
--color-success: #10B981;        /* Green */
--color-warning: #F59E0B;        /* Amber */
--color-error: #EF4444;          /* Red */
```

### Typography
- **Font**: Poppins (Google Fonts)
- **Sizes**: `--font-size-xs` (0.75rem) to `--font-size-5xl` (3rem)
- **Weights**: 300 (light) to 900 (black)

## 🧩 Using UI Components

### 1. Button Component

```jsx
import { Button } from '../../components/UI';
import { VscArrowRight, VscAdd } from 'react-icons/vsc';

// Basic buttons
<Button>Click Me</Button>
<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>

// With icons
<Button icon={VscArrowRight}>With Icon Right</Button>
<Button icon={VscAdd} iconPosition="left">Add New</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>

// States
<Button disabled>Disabled</Button>
<Button loading>Loading...</Button>

// Full width
<Button fullWidth>Full Width</Button>
```

### 2. Input Component

```jsx
import { Input } from '../../components/UI';
import { VscMail } from 'react-icons/vsc';

// Basic input
<Input 
  label="Email" 
  placeholder="Enter email"
  fullWidth
/>

// With icon
<Input 
  label="Search" 
  icon={VscSearch}
  iconPosition="left"
/>

// With validation
<Input 
  label="Username"
  error="Username already taken"
/>

<Input 
  label="Password"
  success
  helperText="Looks good!"
/>

// Sizes
<Input size="sm" />
<Input size="md" />
<Input size="lg" />
```

### 3. Card Component

```jsx
import { Card, CardHeader, CardBody, CardFooter } from '../../components/UI';

// Simple card
<Card>
  <p>Simple content</p>
</Card>

// Card with sections
<Card padding="lg">
  <CardHeader 
    title="My Title" 
    subtitle="Optional description"
  />
  <CardBody>
    <p>Main content here</p>
  </CardBody>
  <CardFooter>
    <Button>Action Button</Button>
  </CardFooter>
</Card>

// Padding options
<Card padding="sm">Small padding</Card>
<Card padding="md">Medium padding</Card>
<Card padding="lg">Large padding</Card>

// Interactive card
<Card clickable>Click to interact</Card>
```

### 4. Badge Component

```jsx
import { Badge } from '../../components/UI';
import { VscCheck } from 'react-icons/vsc';

// Variants
<Badge variant="primary">Primary</Badge>
<Badge variant="success">Active</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="error">Error</Badge>
<Badge variant="outline">Outline</Badge>

// Sizes
<Badge size="sm">Small</Badge>
<Badge size="md">Medium</Badge>
<Badge size="lg">Large</Badge>

// With icon
<Badge variant="success" icon={VscCheck}>
  Connected
</Badge>
```

### 5. Alert Component

```jsx
import { Alert } from '../../components/UI';

// Variants
<Alert variant="info">Information message</Alert>
<Alert variant="success">Success message</Alert>
<Alert variant="warning">Warning message</Alert>
<Alert variant="error">Error message</Alert>

// With title
<Alert variant="success" title="Success!">
  Your changes have been saved
</Alert>

// Closable
<Alert variant="info" closable onClose={() => console.log('closed')}>
  Dismissible alert
</Alert>
```

### 6. Loading Component

```jsx
import { Loading, LoadingOverlay } from '../../components/UI';

// Loading spinner
<Loading size="sm" />
<Loading size="md" />
<Loading size="lg" />

// Fullscreen loading
<Loading fullscreen />

// Loading overlay
<LoadingOverlay />
```

## 📱 Responsive Design

### Breakpoints
```css
@media (max-width: 1024px) { /* Tablets */ }
@media (max-width: 768px)  { /* Mobile Large */ }
@media (max-width: 480px)  { /* Mobile Small */ }
```

### Example
```jsx
<div className="responsive-grid">
  {/* Grid will stack on mobile */}
</div>

// CSS
.responsive-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--space-lg);
}

@media (max-width: 768px) {
  .responsive-grid {
    grid-template-columns: 1fr;
  }
}
```

## 🚀 Common Page Patterns

### Page Header
```jsx
<div className="page-header">
  <h1>Page Title</h1>
  <p>Subtitle or description</p>
</div>
```

### Section Header
```jsx
<div className="section-header">
  <h2>Section Title</h2>
  <p>Description</p>
</div>
```

### Centered Content Container
```jsx
<div style={{ 
  maxWidth: 'var(--max-content-width)',
  margin: '0 auto',
  padding: 'var(--space-xl)'
}}>
  Content here
</div>
```

### List of Items
```jsx
<div className="items-list">
  {items.map(item => (
    <Card key={item.id} padding="md" clickable>
      <strong>{item.title}</strong>
      <p>{item.description}</p>
    </Card>
  ))}
</div>
```

## 🎯 Best Practices

### 1. Always Use Design System Variables
```jsx
// ✅ Good
padding: var(--space-lg);
color: var(--color-primary);
font-size: var(--font-size-lg);

// ❌ Avoid
padding: 20px;
color: #0E3B4C;
font-size: 18px;
```

### 2. Component Composition
```jsx
// ✅ Good - Use components
import { Card, CardHeader, CardBody } from '../../components/UI';

// ❌ Avoid - Creating custom cards
<div className="my-custom-card">...</div>
```

### 3. Icon Handling
```jsx
// ✅ Good
import { VscAdd, VscDelete } from 'react-icons/vsc';
<Button icon={VscAdd}>Add Item</Button>

// ✅ Also good - emoji for simple cases
<span>✅ Completed</span>
```

### 4. Form Organization
```jsx
// ✅ Good
<div className="form-grid">
  <Input label="First Name" />
  <Input label="Last Name" />
</div>

// CSS
.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-lg);
}
```

## 🐛 Debugging

### Check CSS Variables Loaded
```javascript
// In browser console
getComputedStyle(document.documentElement).getPropertyValue('--color-primary')
// Returns: " #0E3B4C"
```

### Check Component Props
```jsx
// Use React DevTools to inspect component props
// or add console.log in component
console.log('Button props:', { variant, size, disabled });
```

### Common Issues

| Issue | Solution |
|-------|----------|
| Styles not applying | Clear cache, check CSS order, verify variables |
| Component not rendering | Check import path, verify default export |
| Icon not showing | Verify react-icons import, check icon name |
| Mobile styles not working | Check media query syntax, verify breakpoint |

## 📚 Resources

- **Design Tokens**: `src/theme/tokens.js`
- **Component Library**: `src/components/UI/`
- **Global Styles**: `src/index.css`
- **Mobile Design**: Check `mobile/lib/theme/theme.dart` for reference

---

Happy coding! The modern design system is ready to use. 🎉
