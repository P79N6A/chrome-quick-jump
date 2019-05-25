import { Callout, Classes, MenuItem } from '@blueprintjs/core'
import { IItemRendererProps, Omnibar } from '@blueprintjs/select'
import * as React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as env from './env'
import './App.css'
import TabMatcher, { Entry } from './TabMatcher'

type Tab = chrome.tabs.Tab

function mark(str: string, matches: Array<{ start: number; end: number }>) {
  // console.log(matches)
  if (matches == null || matches.length === 0) {
    return str
  }

  let t = 0
  let result: React.ReactNode[] = []
  for (const { start, end } of matches) {
    if (t < start) {
      result.push(<span key={t}>{str.substring(t, start)}</span>)
    }
    result.push(<em key={start}>{str.substring(start, end)}</em>)
    t = end
  }
  if (t < str.length) {
    result.push(<span key={t}>{str.substring(t)}</span>)
  }
  return result
}

const itemRenderer = (entry: Entry, { modifiers, handleClick }: IItemRendererProps) => {
  return (
    <MenuItem
      key={entry.tab.id}
      active={modifiers.active}
      text={
        <div className="search-item">
          <div className="left-part">
            <div className="search-item-title">{mark(entry.tab.title, entry.titleMatches)}</div>
            <small className={Classes.TEXT_MUTED}>{mark(entry.tab.url, entry.urlMatches)}</small>
          </div>
          {entry.tab.favIconUrl ? (
            <img src={entry.tab.favIconUrl} />
          ) : (
            <div className="placeholder" />
          )}
        </div>
      }
      onClick={handleClick}
    />
  )
}

const fuseOptions = {
  shouldSort: true,
  includeMatches: true,
  tokenize: true,
  threshold: 0.2,
  location: 0,
  distance: 1000,
  maxPatternLength: 32,
  minMatchCharLength: 1,
  keys: ['title', 'url'],
}

export default function App() {
  const [tabs, setTabs] = useState<Tab[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')

  const fuse = useMemo(() => new TabMatcher(tabs), [tabs])
  const searchResult = useMemo(() => fuse.search(query.split(/\s+/).filter(Boolean)), [fuse, query])

  useEffect(() => {
    const unsubscribe = env.addOpenQuickJumpCallback(openQuickJump)
    env.signalReadyForQuickJump()
    return unsubscribe
  }, [])

  useEffect(() => {
    if (isOpen) {
      env.setLastQuery(query)
    }
  }, [query, isOpen])

  const [activeItemId, onChangeActiveItemId] = useState<number>(-1)
  const activeItem = searchResult.find(entry => entry.tab.id === activeItemId)
  const inputRef = useRef<HTMLInputElement>()

  return (
    <>
      {env.isStandaloneMode() && (
        <Callout
          className="standalone-info"
          intent="primary"
          title="独立标签页说明"
          icon="info-sign"
        >
          quick-jump 通过向页面注入代码来实现页面内弹框。 受 chrome
          政策限制，拓展不能向部分页面注入代码，quick-jump 已打开独立页面。
        </Callout>
      )}
      <Omnibar
        query={query}
        overlayProps={{ className: env.isStandaloneMode() ? 'env-standalone' : '' }}
        onQueryChange={nextQuery => setQuery(nextQuery)}
        inputProps={{ inputRef: inputRef as any, autoFocus: true }}
        activeItem={activeItem}
        onActiveItemChange={entry => {
          if (entry == null) {
            onChangeActiveItemId(-1)
          } else {
            onChangeActiveItemId(entry.tab.id)
          }
        }}
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false)
          env.hideContainer()
        }}
        items={searchResult}
        itemRenderer={itemRenderer}
        onItemSelect={entry => {
          env.jumpTo(entry.tab)
          setIsOpen(false)
          env.hideContainer()
        }}
      />
    </>
  )

  function openQuickJump(tabs: Tab[], initQuery: string) {
    if (!isOpen) {
      setIsOpen(true)
      setQuery(initQuery)
    }
    setTabs(tabs)
    requestAnimationFrame(() => {
      inputRef.current.select()
      inputRef.current.focus()
    })
  }
}
