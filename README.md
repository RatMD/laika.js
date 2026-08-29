LAIKA for Vue and Vite
======================

> [!CAUTION]
> LAIKA is currently experimental. APIs may change before a stable release.

**LAIKA** is an Inertia-inspired Vue and Vite adapter for October CMS. It lets you build an October
CMS theme with Vue while continuing to use October components, partials, content blocks, snippets,
AJAX handlers, and other CMS features.

This package provides the browser runtime, Vue components, composables, TypeScript declarations,
and Vite integration. It is designed to be used with the
[LAIKA plugin for October CMS](https://github.com/RatMD/laika-plugin).

## Requirements

- PHP 8.4+
- October CMS 4.2+
- Vue 3
- Vite
- [LAIKA plugin](https://github.com/RatMD/laika-plugin)

## Installation

Install the JavaScript package from npm:

```sh
npm install @ratmd/laika
```

Install and configure the companion October CMS plugin separately:

```sh
php artisan plugin:install RatMD.Laika
```

## Vite Configuration

Add the LAIKA plugin to your Vite configuration:

```ts
import vue from '@vitejs/plugin-vue';
import laika from '@ratmd/laika/vite';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [
        laika(),
        vue(),
    ],
});
```

The Vite integration extracts translation keys and removes server-side `<october>` and `<php>`
blocks from Vue components during frontend compilation.

## Creating the Vue Application

Use `createLaikaApp` to resolve page components and mount the Vue application:

```ts
import { createApp, h } from 'vue';
import { createLaikaApp, type ResolveResult } from '@ratmd/laika';

const pages = import.meta.glob('./pages/**/*.vue', { eager: true });

createLaikaApp({
    resolve(name: string): ResolveResult {
        const component = pages[`./pages/${name}.vue`];

        if (!component) {
            throw new Error(`Page component "${name}" was not found.`);
        }

        return component as ResolveResult;
    },

    setup({ App, root, props, plugin }) {
        const app = createApp({
            render: () => h(App, props),
        });

        app.use(plugin);
        app.mount(root);

        return app;
    },
});
```

By default, LAIKA mounts the application on the first element matching `.app`. A different selector
can be supplied using the `rootId` option.

## Public API

The main `@ratmd/laika` entry point exports:

- `createLaikaApp` for application bootstrapping
- `useLaika`, `usePayload`, `useSite`, `usePage`, `useShared`, and `useTheme`
- `useRouter`, `useOctober`, `useComponent`, and `useOctoberFilter`
- `Head`, `Link`, `Flash`, `ProgressBar`, and other LAIKA Vue components
- TypeScript declarations for payloads, routing, October components, and application configuration

The `@ratmd/laika/vite` entry point exports the LAIKA Vite plugin.

## Demo

See the [LAIKA demo theme](https://github.com/RatMD/laika-demo-theme) for a complete October CMS
theme built with Vue and Vite.

## Development

```sh
npm install
npm run type-check
npm run build
```

Use `npm run watch` to rebuild the package while developing.

## Documentation

The documentation can be found on [docs.laika.works](https://docs.laika.works).

## License

Copyright © 2025–2026 [rat.md](https://rat.md).  
Published under the MIT License.
