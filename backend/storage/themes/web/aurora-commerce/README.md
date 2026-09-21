# Aurora Commerce

Aurora Commerce is the official new enterprise reference package for B2B and B2C storefronts. It is isolated at `storage/themes/web/aurora-commerce` and is designed for the current Enterprise Theme Engine, Theme Builder, Preview System, Translation System, and Theme Runtime.

## Installation

1. Upload `aurora-commerce-v1.0.0.zip` in the Super Admin Theme Manager.
2. Run the normal theme validation pipeline.
3. Review the generated compatibility and localization reports.
4. Create a draft release and open Live Preview.
5. Configure logo, colors, typography, navigation, social links, and section content.
6. Complete review and approval before publishing.

The package contains no runtime code and does not require a platform runtime change. All display text is represented by locale keys. Every locale has identical key parity with `locales/en.json`.

## Builder contract

Sections and blocks expose `settingsSchema`, `defaultSettings`, and `editable: true`. Translation-enabled fields are marked with `translation: true`; assets are relative package paths; HTML and custom Liquid placeholders are marked sanitized/non-runtime contracts.

## Supported preview modes

Desktop, tablet, mobile, RTL, and dark mode are declared in the manifest and token system. The included preview images are generated from the package preview composition.
