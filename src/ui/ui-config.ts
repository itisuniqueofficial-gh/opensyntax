/**
 * Runtime UI configuration.
 *
 * Renderers read this instead of importing AppConfig directly,
 * keeping the renderer layer decoupled from the config system.
 *
 * Respects NO_COLOR and FORCE_COLOR environment variables.
 */

export type UiConfig = {
  markdown: boolean;
  syntaxHighlighting: boolean;
  codeBox: boolean;
  lineNumbers: boolean;
  unicodeBoxes: boolean;
  clickableLinks: boolean;
  theme: 'dark' | 'light' | 'no-color';
};

const defaults: UiConfig = {
  markdown: true,
  syntaxHighlighting: true,
  codeBox: true,
  lineNumbers: true,
  unicodeBoxes: true,
  clickableLinks: false,
  theme: 'dark'
};

let _config: UiConfig = {...defaults};

/** Apply NO_COLOR / FORCE_COLOR env overrides. */
function applyEnvOverrides(cfg: UiConfig): UiConfig {
  if (process.env.NO_COLOR !== undefined) {
    return {...cfg, syntaxHighlighting: false, theme: 'no-color'};
  }
  return cfg;
}

/** Get the current UI config (env overrides applied). */
export function getUiConfig(): UiConfig {
  return applyEnvOverrides(_config);
}

/** Update the UI config (called from /markdown, /highlight, /codebox, /theme). */
export function setUiConfig(partial: Partial<UiConfig>): void {
  _config = {..._config, ...partial};
}

/** Reset to defaults. */
export function resetUiConfig(): void {
  _config = {...defaults};
}

/** Apply settings from AppConfig on startup. */
export function applyAppConfig(cfg: {
  markdown?: boolean;
  syntaxHighlighting?: boolean;
  codeBox?: boolean;
  lineNumbers?: boolean;
  unicodeBoxes?: boolean;
  clickableLinks?: boolean;
  theme?: string;
}): void {
  _config = {
    markdown: cfg.markdown ?? defaults.markdown,
    syntaxHighlighting: cfg.syntaxHighlighting ?? defaults.syntaxHighlighting,
    codeBox: cfg.codeBox ?? defaults.codeBox,
    lineNumbers: cfg.lineNumbers ?? defaults.lineNumbers,
    unicodeBoxes: cfg.unicodeBoxes ?? defaults.unicodeBoxes,
    clickableLinks: cfg.clickableLinks ?? defaults.clickableLinks,
    theme: (cfg.theme as UiConfig['theme']) ?? defaults.theme
  };
}
