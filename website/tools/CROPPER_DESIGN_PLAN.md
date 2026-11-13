# Cropper interface plan

This implementation adapts Apple Human Interface Guidelines principles to the web cropper without redistributing Apple's platform UI kits or assets.

## Interaction model

- Use a leading asset rail, central content canvas, and trailing properties inspector so reading order matches task order.
- Keep the image visually dominant and separate content from controls with a neutral dark canvas.
- Pair familiar icons with visible labels. Icons reinforce actions; they do not replace accessible names.
- Group related controls, align their labels, and keep exact pixel coordinates progressively disclosed.
- Use system-blue selection and action states, consistent rounded controls, visible focus rings, and minimum 40–44px primary targets.
- Collapse the three-pane layout into Edit and Export tabs on compact screens while preserving the fixed export action.

## Hugeicons mapping

- Add images: `ImageAdd01Icon`
- Previous / next: `ArrowLeft01Icon`, `ArrowRight01Icon`
- Group / individual scope: `UserGroupIcon`, `UserIcon`
- Zoom: `ZoomInIcon`, `ZoomOutIcon`
- Rotate / flip / reset: `RotateCropIcon`, `ImageFlipHorizontalIcon`, `UndoIcon`
- Preview / export: `MagicWand02Icon`, `Download04Icon`

The selected definitions are vendored from `@hugeicons/core-free-icons` 4.3.5 under the MIT license.

## References

- [Apple Human Interface Guidelines — Layout](https://developer.apple.com/design/human-interface-guidelines/layout)
- [Apple Design Resources](https://developer.apple.com/design/resources/)
- [Hugeicons official repository](https://github.com/hugeicons/hugeicons)
