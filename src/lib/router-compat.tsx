/**
 * Compatibility shim for code originally written against react-router-dom.
 * Re-exports TanStack Router primitives with relaxed types so existing
 * <Link to={`/x/${id}`}> / useNavigate("/x") / useParams<{x:string}>() call
 * sites keep working during the port.
 */
import * as React from "react";
import {
  Link as TSRLink,
  Navigate as TSRNavigate,
  Outlet,
  useNavigate as useTSRNavigate,
  useParams as useTSRParams,
  useRouter,
  useRouterState,
  useSearch as useTSRSearch,
} from "@tanstack/react-router";

export { Outlet };

type AnyProps = Record<string, any>;

export const Link = React.forwardRef<HTMLAnchorElement, AnyProps>(function Link(
  { to, replace, state: _state, end: _end, ...rest },
  ref,
) {
  // TanStack accepts runtime string paths even though typings prefer typed routes.
  const LinkAny = TSRLink as unknown as React.ComponentType<AnyProps>;
  return <LinkAny ref={ref} to={to} replace={replace} {...rest} />;
});

export type NavLinkProps = AnyProps;

/**
 * react-router-dom NavLink shim. The className/style render props receive
 * { isActive, isPending } — we drive them from TanStack's active match state.
 */
export const NavLink = React.forwardRef<HTMLAnchorElement, AnyProps>(function NavLink(
  { to, className, style, children, end, ...rest },
  ref,
) {
  const LinkAny = TSRLink as unknown as React.ComponentType<AnyProps>;
  // TSR Link expects className/style as STRING — passing a function leaves the
  // attribute blank. Resolve the react-router-dom style render-prop API into
  // separate baseProps + activeProps that TSR can merge.
  const inactiveState = { isActive: false, isPending: false, isTransitioning: false };
  const activeState = { isActive: true, isPending: false, isTransitioning: false };
  const inactiveClass = typeof className === "function" ? className(inactiveState) : className;
  const activeClass = typeof className === "function" ? className(activeState) : undefined;
  const inactiveStyle = typeof style === "function" ? style(inactiveState) : style;
  const activeStyle = typeof style === "function" ? style(activeState) : undefined;
  return (
    <LinkAny
      ref={ref}
      to={to}
      activeOptions={end ? { exact: true } : undefined}
      className={inactiveClass}
      style={inactiveStyle}
      activeProps={
        activeClass !== undefined || activeStyle !== undefined
          ? { className: activeClass, style: activeStyle }
          : undefined
      }
      {...rest}
    >
      {typeof children === "function"
        ? (state: any) => children({ isActive: !!state?.isActive, isPending: false, isTransitioning: false })
        : children}
    </LinkAny>
  );
});

export function Navigate(props: AnyProps) {
  const NavAny = TSRNavigate as unknown as React.ComponentType<AnyProps>;
  return <NavAny {...props} />;
}

/**
 * Drop-in replacement for react-router-dom's useNavigate. Supports:
 *   navigate("/path")
 *   navigate("/path", { replace: true })
 *   navigate(-1) / navigate(1)
 */
export function useNavigate() {
  const tsrNavigate = useTSRNavigate();
  const router = useRouter();
  return React.useCallback(
    (to: string | number, options?: { replace?: boolean; state?: unknown }) => {
      if (typeof to === "number") {
        if (to < 0) for (let i = 0; i < -to; i++) router.history.back();
        else for (let i = 0; i < to; i++) router.history.forward();
        return;
      }
      return (tsrNavigate as any)({ to, replace: options?.replace });
    },
    [tsrNavigate, router],
  );
}

export function useParams<T extends Record<string, string | undefined> = Record<string, string | undefined>>(): T {
  return useTSRParams({ strict: false }) as T;
}

export function useLocation() {
  return useRouterState({ select: (s) => s.location });
}

export function useSearchParams(): [URLSearchParams, (next: URLSearchParams | Record<string, string>) => void] {
  const location = useLocation();
  const navigate = useTSRNavigate();
  const params = React.useMemo(() => {
    const search = (location as any).searchStr ?? "";
    return new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  }, [location]);
  const setParams = React.useCallback(
    (next: URLSearchParams | Record<string, string>) => {
      const obj =
        next instanceof URLSearchParams ? Object.fromEntries(next.entries()) : next;
      (navigate as any)({ to: ".", search: obj, replace: true });
    },
    [navigate],
  );
  return [params, setParams];
}

// react-router-dom also exports these; keep as best-effort passthroughs.
export const useSearch = useTSRSearch;