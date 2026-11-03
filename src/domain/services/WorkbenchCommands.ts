/**
 * The built-in commands a layout is made of.
 *
 * Only plain strings: the planner emits them, and the host runs them, so the
 * domain stays free of `vscode` while still speaking the workbench's language.
 */
export const WorkbenchCommands = {
    closeSideBar: 'workbench.action.closeSidebar',
    focusSideBar: 'workbench.action.focusSideBar',

    closeSecondarySideBar: 'workbench.action.closeAuxiliaryBar',
    focusSecondarySideBar: 'workbench.action.focusAuxiliaryBar',
    maximizeSecondarySideBar: 'workbench.action.maximizeAuxiliaryBar',
    restoreSecondarySideBar: 'workbench.action.restoreAuxiliaryBar',

    closePanel: 'workbench.action.closePanel',
    focusPanel: 'workbench.action.focusPanel',
    toggleMaximizedPanel: 'workbench.action.toggleMaximizedPanel',

    focusEditor: 'workbench.action.focusActiveEditorGroup',

    panelPosition: {
        bottom: 'workbench.action.positionPanelBottom',
        top: 'workbench.action.positionPanelTop',
        left: 'workbench.action.positionPanelLeft',
        right: 'workbench.action.positionPanelRight',
    },
    panelAlignment: {
        center: 'workbench.action.alignPanelCenter',
        justify: 'workbench.action.alignPanelJustify',
        left: 'workbench.action.alignPanelLeft',
        right: 'workbench.action.alignPanelRight',
    },

    /** VS Code registers `<viewId>.focus` for every view. */
    focusView: (view: string) => `${view}.focus`,
} as const;
