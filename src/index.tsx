import hydrate from 'preact-iso/hydrate'
import { useEffect, useReducer, useRef, useState } from 'preact/hooks'
import { css } from 'goober'

const checkNpmAvailability = async (name: string) => {
  const res = await fetch(
    `https://cors-anywhere.herokuapp.com/https://registry.npmjs.org/${name}`,
  )
  return res.status === 404
}

interface Result {
  npmAvailable: true | false
}

/*

1. Word itself
2. Sounds like word
2. Rhymes with word
3. Related to word
4. Rhymes with related
5. Sounds like related

*/

const symbolForAtom = Symbol()

interface Atom<Result> {
  [symbolForAtom]: true
  input: Result | ResultGetter<Result>
}

type ResultGetter<Result> = (
  get: <GetType, Fallback = undefined>(
    dependency: Atom<GetType>,
    fallback?: Fallback,
  ) => GetType | Fallback,
) => Promise<Result>

const atom = <Result extends unknown>(
  input: Result | ResultGetter<Result>,
): Atom<Result> => ({ [symbolForAtom]: true, input })

const isPromise = (input: unknown): input is Promise<unknown> =>
  // @ts-expect-error
  typeof input === 'object' && typeof input.then === 'function'

const useSnapshot = <Result extends unknown>(atom: Atom<Result>) => {
  const [outerAtomResult, setOuterAtomResult] = useState<Result | undefined>(
    undefined,
  )
  // it is a map so pass by reference will work fine
  const state = useRef(new Map<Atom<unknown>, unknown>()).current
  const dependencies = useRef(new Map<Atom<unknown>, Set<Atom<unknown>>>())
    .current
  const addDependency = (dependee: Atom<unknown>, depender: Atom<unknown>) => {
    if (!dependencies.has(dependee)) dependencies.set(dependee, new Set())
    dependencies.get(dependee)!.add(depender)
  }
  const evaluateAtom = (evaluatee: Atom<unknown>) => {
    if (typeof evaluatee.input !== 'function') return
    const evaluationPromise = Promise.resolve().then(async () => {
      state.set(evaluatee, evaluationPromise)
      const getter = evaluatee.input as ResultGetter<unknown>
      const atomResult = await getter((subAtom, fallback) => {
        if (state.has(subAtom)) {
          const cached = state.get(subAtom)
          addDependency(subAtom, evaluatee)
          // it is already being evaluated, let it continue (resolve is tracked due to dependency)
          if (isPromise(cached)) return fallback
          // if it is in the cache and it is not a promise; it has already been evaluated
          return cached as any
        }
        // it is not evaluated yet, evaluate it now
        evaluateAtom(subAtom)
        return fallback
      })
      // getter has resolved
      // save the result
      state.set(evaluatee, atomResult)
      // now fire dependencies
      dependencies.get(evaluatee)?.forEach((dep) => evaluateAtom(dep))
      // trigger a re-render if this atom is the one used via useSnapshot()
      if (evaluatee === atom) setOuterAtomResult(atomResult as Result)
    })
  }
  evaluateAtom(atom)
  return outerAtomResult
}

const [searchTermAtom, useSetSearchTermAtom] = atom()
// TODO: How to feed values from props/state into atom?
const soundsLikeAtom = atom(async function soundsLikeAtom(get) {
  const baseWord = get(searchTermAtom)
  const res = await fetch(`https://api.datamuse.com/words?sl=${baseWord}`)
  return (await res.json()) as { word: string }[]
})
const resultsAtom = atom(async function resultsAtom(get) {
  const soundsLike = get(soundsLikeAtom)
  if (!soundsLike) return
  return aggregateAll(
    soundsLike.map(async (similarSounding) => {
      return {
        npmAvailable: await checkNpmAvailability(similarSounding.word),
      }
    }),
  )
})

export const App = () => {
  const inputRef = useRef<HTMLInputElement>()
  const [searchTerm, setSearchTerm] = useState('')

  const results = useSnapshot(soundsLikeAtom)

  return (
    <div>
      <form
        onSubmit={(e) => {
          // e.preventDefault()
          // setSearchTerm(inputRef.current.value)
        }}
      >
        <input
          type="text"
          ref={inputRef}
          onInput={(e) => setSearchTerm(e.currentTarget.value)}
        />
        <pre>{JSON.stringify(results)}</pre>
        <ol>
          {/*[...results].map(([name, result]) => {
            return (
              <li key={name}>
                {name} - {result.npmAvailable}
              </li>
            )
          })*/}
        </ol>
      </form>
    </div>
  )
}

hydrate(<App />)

export async function prerender() {
  const { default: prerender } = await import('preact-iso/prerender')
  return await prerender(<App />)
}
