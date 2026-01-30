import { ae as sanitize_props, af as spread_props, a7 as slot } from './index2-DXgNDLRr.js';
import { I as Icon } from './Icon-BPQyULtO.js';

function Folder_git_2($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  /**
   * @license lucide-svelte v0.469.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const iconNode = [
    [
      "path",
      {
        "d": "M9 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v5"
      }
    ],
    ["circle", { "cx": "13", "cy": "12", "r": "2" }],
    ["path", { "d": "M18 19c-2.8 0-5-2.2-5-5v8" }],
    ["circle", { "cx": "20", "cy": "19", "r": "2" }]
  ];
  Icon($$renderer, spread_props([
    { name: "folder-git-2" },
    $$sanitized_props,
    {
      /**
       * @component @name FolderGit2
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNOSAyMEg0YTIgMiAwIDAgMS0yLTJWNWEyIDIgMCAwIDEgMi0yaDMuOWEyIDIgMCAwIDEgMS42OS45bC44MSAxLjJhMiAyIDAgMCAwIDEuNjcuOUgyMGEyIDIgMCAwIDEgMiAydjUiIC8+CiAgPGNpcmNsZSBjeD0iMTMiIGN5PSIxMiIgcj0iMiIgLz4KICA8cGF0aCBkPSJNMTggMTljLTIuOCAwLTUtMi4yLTUtNXY4IiAvPgogIDxjaXJjbGUgY3g9IjIwIiBjeT0iMTkiIHI9IjIiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/folder-git-2
       * @see https://lucide.dev/guide/packages/lucide-svelte - Documentation
       *
       * @param {Object} props - Lucide icons props and any valid SVG attribute
       * @returns {FunctionalComponent} Svelte component
       *
       */
      iconNode,
      children: ($$renderer2) => {
        $$renderer2.push(`<!--[-->`);
        slot($$renderer2, $$props, "default", {});
        $$renderer2.push(`<!--]-->`);
      },
      $$slots: { default: true }
    }
  ]));
}

export { Folder_git_2 as F };
//# sourceMappingURL=folder-git-2-C3k16tBE.js.map
