import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as content from './index.js'
import counts from './counts.json'

describe('content/index', () => {
  it('getCategory finds category by id', () => {
    const cat = content.getCategory('culture-generale')
    expect(cat).toBeDefined()
    expect(cat.id).toBe('culture-generale')
  })

  it('getCategory returns undefined for unknown id', () => {
    expect(content.getCategory('unknown')).toBeUndefined()
  })

  it('getCategories filters out frOnly for non-fr languages', () => {
    const frCategories = content.getCategories('fr')
    const enCategories = content.getCategories('en')
    expect(frCategories.some(c => c.id === 'code-route')).toBe(true)
    expect(enCategories.some(c => c.id === 'code-route')).toBe(false)
  })

  it('loadBank loads the bank and caches it', async () => {
    expect(content.isBankReady('culture-generale')).toBe(false)
    const questions = await content.loadBank('culture-generale')
    expect(questions.length).toBeGreaterThan(0)
    expect(content.isBankReady('culture-generale')).toBe(true)
    
    // Consecutive calls should return the same resolved promise/cached data
    const questions2 = await content.loadBank('culture-generale')
    expect(questions2).toBe(questions)
  })

  it('loadBank rejects for unknown category', async () => {
    await expect(content.loadBank('unknown')).rejects.toThrow('catégorie inconnue : unknown')
  })

  it('getQuestions returns empty array if not loaded', () => {
    expect(content.getQuestions('cinema-series', 'facile')).toEqual([])
  })

  it('getQuestions returns questions by difficulty after loading', async () => {
    await content.loadBank('cinema-series')
    const facile = content.getQuestions('cinema-series', 'facile')
    const expert = content.getQuestions('cinema-series', 'expert')
    expect(facile.length).toBeGreaterThan(0)
    expect(expert.length).toBeGreaterThan(0)
    expect(facile[0].difficulty).toBe('facile')
    expect(expert[0].difficulty).toBe('expert')
  })

  it('countQuestions returns count from counts.json without loading', () => {
    const facileCount = content.countQuestions('manga-anime', 'facile')
    expect(facileCount).toBe(counts['manga-anime'].facile)
    expect(content.countQuestions('unknown', 'facile')).toBe(0)
  })

  it('localizeQuestion flattens question text according to lang', () => {
    const q = {
      id: 'test',
      question: { fr: 'Q FR', en: 'Q EN' },
      options: { fr: ['A', 'B'], en: ['1', '2'] },
      explanation: { fr: 'E FR', en: 'E EN' },
      correct: 0
    }
    const locFr = content.localizeQuestion(q, 'fr')
    expect(locFr.question).toBe('Q FR')
    expect(locFr.options).toEqual(['A', 'B'])
    expect(locFr.explanation).toBe('E FR')

    const locEn = content.localizeQuestion(q, 'en')
    expect(locEn.question).toBe('Q EN')
    expect(locEn.options).toEqual(['1', '2'])
    expect(locEn.explanation).toBe('E EN')
  })

  it('getLocalizedQuestions loads and localizes', async () => {
    await content.loadBank('panneaux')
    const questions = content.getLocalizedQuestions('panneaux', 'facile', 'en')
    // panneaux is frOnly but we can still ask for 'en' fallback
    expect(questions.length).toBeGreaterThan(0)
    expect(typeof questions[0].question).toBe('string')
  })
})
