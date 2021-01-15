// Make Preact's JSX the global JSX
declare namespace JSX {
  // @ts-ignore
  interface IntrinsicElements extends preact.JSX.IntrinsicElements {}
  // @ts-ignore
  interface IntrinsicAttributes extends preact.JSX.IntrinsicAttributes {}
  // @ts-ignore
  interface Element extends preact.JSX.Element {}
  // @ts-ignore
  interface ElementClass extends preact.JSX.ElementClass {}
  interface ElementAttributesProperty
    extends preact.JSX.ElementAttributesProperty {}
  interface ElementChildrenAttribute
    extends preact.JSX.ElementChildrenAttribute {}
  interface CSSProperties extends preact.JSX.CSSProperties {}
  interface SVGAttributes extends preact.JSX.SVGAttributes {}
  interface PathAttributes extends preact.JSX.PathAttributes {}
  interface TargetedEvent extends preact.JSX.TargetedEvent {}
  interface DOMAttributes<Target extends EventTarget>
    extends preact.JSX.DOMAttributes<Target> {}
  interface HTMLAttributes<RefType extends EventTarget = EventTarget>
    extends preact.JSX.HTMLAttributes<RefType> {}
}

declare module 'preact-iso/hydrate' {
  export default function (component: JSX.Element): void
}

declare module 'preact-iso/prerender' {
  export default function (component: JSX.Element): Promise<void>
}
