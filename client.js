/**
 * Compact sidebar layout + resource-record repair.
 *
 * Part 1: squeeze the sidebar's global navigation (Plugins / Market /
 * Automations / Task board / Skills / SSH / MCP) into a compact two-column grid
 * that may shrink and scroll, and keep a height floor for the workspace /
 * session history region underneath it. The rules are deliberately not media-
 * gated: phone and desktop show the same sidebar, so they get the same density.
 *
 * Part 2: repair. Some browsers parse `dsh-resource://<protocol>/...` with the
 * native URL parser and report an empty hostname, so the resource registry 鈥? * which reads the protocol from that hostname 鈥?pins every record to status
 * "none" even though the protocol's provider is registered. That surfaces as
 * "鏂囦欢璧勬簮鏈嶅姟涓嶅彲鐢? on document/image tabs and "璁″垝棰勮涓嶅彲鐢? on plan
 * tabs, and a reload does not help because the parse fails every time.
 *
 * The address grammar is unambiguous, so this plugin re-derives the protocol
 * from the address string itself: it patches the registry's record factory so
 * every later record is created on the right protocol, and heals the records
 * the registry already holds through its own attach path.
 *
 * The repair only touches records whose protocol the registry failed to
 * resolve, so it is a no-op on engines that parse the authority correctly.
 */
window.__ModuleLoader__.load({
  id: 'dsh-compact-sidebar',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const CSS = `
  /* Global navigation: compact two-column grid */
  [class*="panelList"] {
    display: grid !important;
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 2px 4px !important;
    margin-bottom: 6px !important;
  }
  [class*="panelRow"] {
    min-height: 30px !important;
    height: 30px !important;
    padding: 0 6px !important;
    margin: 0 !important;
    gap: 6px !important;
    font-size: 12px !important;
    line-height: 18px !important;
    overflow: hidden !important;
  }
  [class*="panelTitle"] {
    min-width: 0 !important;
    font-size: 12px !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }
  [class*="panelGlyph"] {
    flex: none !important;
  }
  [class*="panelGlyph"] svg {
    width: 14px !important;
    height: 14px !important;
  }
  [class*="footArea"] {
    row-gap: 2px !important;
  }

  /*
   * Only where vertical room actually runs out: cap the navigation so it can
   * shrink and scroll, and hold a floor under the session list. Never applied on
   * a roomy desktop window 鈥?there the sidebar already fills exactly 100% via
   * flex, and forcing a viewport-relative floor would push its content past the
   * container and clip the window's bottom edge.
   */
  @media (max-width: 820px), (max-height: 700px), (pointer: coarse) {
    [class*="panelList"] {
      flex: 0 1 auto !important;
      min-height: 0 !important;
      max-height: 34vh !important;
      overflow-y: auto !important;
      overflow-x: hidden !important;
    }
    [class*="regionArea"] {
      min-height: 38vh !important;
    }
  }
`;

    /**
     * Off switch for A/B checking: `localStorage['dsh-compact-sidebar'] = 'off'`
     * then reload. Only the layout is affected; the resource repair runs either
     * way.
     */
    function layoutEnabled() {
      try {
        return window.localStorage.getItem('dsh-compact-sidebar') !== 'off';
      } catch {
        return true;
      }
    }

    /** Style carrier: mounts the CSS above and renders no visible content. */
    function CompactSidebarStyles() {
      if (!layoutEnabled()) return null;
      return h('style', {
        'data-plugin': 'dsh-compact-sidebar',
        dangerouslySetInnerHTML: { __html: CSS },
      });
    }

    /** The protocol key of a resource address, read from the string, not the URL parser. */
    function protocolOf(address) {
      if (typeof address !== 'string') return undefined;
      const match = /^dsh-resource:\/\/([^/?#]+)/i.exec(address);
      if (match === null) return undefined;
      const protocol = match[1].toLowerCase();
      return protocol === '' ? undefined : protocol;
    }

    /**
     * Keep the resource registry's records on their real protocol.
     *
     * The `resources` service arrives after this plugin applies, so the caller
     * retries until it is there.
     */
    function createRepair(ctx) {
      const state = { installed: false, healed: 0 };

      const lookup = () => {
        try {
          return typeof ctx.get === 'function' ? ctx.get('resources') : undefined;
        } catch {
          return undefined;
        }
      };

      const adopt = (resources, record) => {
        if (record === undefined || record === null) return;
        if (record.protocol !== undefined) return;
        const protocol = protocolOf(record.address);
        if (protocol === undefined) return;
        record.protocol = protocol;
        state.healed += 1;
        try {
          resources.attach(record);
        } catch {}
      };

      const healOnce = () => {
        const resources = lookup();
        if (resources === undefined || resources === null) return false;
        if (typeof resources.create !== 'function' || typeof resources.attach !== 'function') return false;

        if (resources.__dshProtocolRepair !== true) {
          const originalCreate = resources.create;
          resources.__dshProtocolRepair = true;
          resources.create = function patchedCreate(address) {
            const record = originalCreate.call(this, address);
            adopt(this, record);
            return record;
          };
        }
        state.installed = true;
        try {
          for (const record of resources.records.values()) adopt(resources, record);
        } catch {}
        return true;
      };

      return { state, healOnce };
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        ctx.effect(() => ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
          name: 'sidebar.footer.action',
          id: 'mobile-sidebar-layout',
          order: 50,
        }, CompactSidebarStyles)));

        const repair = createRepair(ctx);
        ctx.effect(() => {
          let attempts = 0;
          const timer = window.setInterval(() => {
            attempts += 1;
            const ready = repair.healOnce();
            if (ready || attempts > 120) window.clearInterval(timer);
          }, 500);
          return () => window.clearInterval(timer);
        }, 'mobile-sidebar: resource protocol repair');
      },
    };
  },
});
