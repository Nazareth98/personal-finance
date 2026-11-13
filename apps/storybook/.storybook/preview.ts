import type { Preview } from '@storybook/react-vite';
import '@personal-finance/tokens/fonts.css';
import '@personal-finance/tokens/theme.css';
import '@personal-finance/ui/styles.css';
import './preview.css';

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Tema visual Corporate UI',
      toolbar: {
        dynamicTitle: true,
        icon: 'circlehollow',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' }
        ]
      }
    }
  },
  initialGlobals: { theme: 'light' },
  decorators: [
    (Story, context) => {
      const mode = context.globals.theme === 'dark' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', mode);
      document.documentElement.style.colorScheme = mode;
      return Story();
    }
  ],
  parameters: {
    layout: 'centered',
    controls: { expanded: true },
    backgrounds: { disable: true }
  }
};
export default preview;
