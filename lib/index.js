//#region lib/types/index.js
/**
 * Host loader entry for the browser-only mind-map plugin.
 *
 * The whole feature lives in the client half (`./client`): the view tab, the
 * layout, and the keyword engine need the Conversation projections and the DOM,
 * and nothing here has host-side behaviour. This mirrors the shipped
 * `@deepseek-ai/dsh-client-ui-trajectory` plugin, whose host half is an empty
 * `apply` — a pure-consumer plugin still needs a resolvable host module so the
 * loader row (`cordis.patch.yml`) and the `dsh.client` scan have one package to
 * point at.
 */

/** Provides no host-side behavior. */
function apply() {}

export { apply };
//#endregion
