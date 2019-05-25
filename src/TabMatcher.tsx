type Tab = chrome.tabs.Tab

export interface Entry {
  tab: Tab
  urlMatches: Array<{ start: number; end: number }>
  titleMatches: Array<{ start: number; end: number }>
}

function sortBy<T>(arr: T[], iteratee: (t: T) => number) {
  return arr.sort((a, b) => iteratee(a) - iteratee(b))
}

// TODO 还需要考虑收藏夹和历史记录
export default class TabMatcher {
  constructor(private tabs: Tab[]) {}

  search(keywords: string[]) {
    const result: Entry[] = []
    for (const tab of this.tabs) {
      const entry: Entry = { tab, titleMatches: [], urlMatches: [] }
      for (const word of keywords) {
        const idx1 = tab.title.indexOf(word)
        if (idx1 !== -1) {
          entry.titleMatches.push({ start: idx1, end: idx1 + word.length })
        }

        const idx2 = tab.url.indexOf(word)
        if (idx2 !== -1) {
          entry.urlMatches.push({ start: idx2, end: idx2 + word.length })
        }
      }

      if (entry.titleMatches.length > 0 || entry.urlMatches.length > 0) {
        result.push(entry)
      }
    }

    sortBy(
      result.filter(
        ({ titleMatches, urlMatches }) => titleMatches.length > 0 || urlMatches.length > 0,
      ),
      entry =>
        entry.urlMatches.reduce((sum, match) => sum + (match.end - match.start), 0) +
        entry.titleMatches.reduce((sum, match) => sum + (match.end - match.start), 0),
    ).reverse()

    return result
  }
}
