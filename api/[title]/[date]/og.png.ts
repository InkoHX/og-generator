import puppeteer, { LaunchOptions } from 'puppeteer-core'
import chromeLambda from 'chrome-aws-lambda'
import { VercelRequest, VercelResponse } from '@vercel/node'
import path from 'path'
import { promises as fs } from 'fs'

const getLaunchOptions = async (): Promise<LaunchOptions> => process.env.AWS_REGION
  ? {
    executablePath: await chromeLambda.executablePath
  } : {
    executablePath: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
  }

const getScreenshot = async (title: string, date: Date): Promise<string | void | Buffer> => {
  const dateTime = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
  const browser = await puppeteer.launch(await getLaunchOptions())
  const page = await browser.newPage()

  await page.setViewport({ width: 1280, height: 680 })
  await page.setContent((await fs.readFile(path.join(__dirname, '_static/template.html'), 'utf-8'))
    .replace('(TITLE_TEXT)', title)
    .replace('(DATE)', dateTime.format(date)))

  return page.screenshot({ type: 'png' })
}

// eslint-disable-next-line
export default async function (request: VercelRequest, response: VercelResponse) {
  try {
    const { title, date } = request.query

    if (typeof title !== 'string') return response.status(400).send({ message: 'Title is required' })
    if (typeof date !== 'string' || Number.isNaN(Date.parse(date))) return response.status(400).send({ message: 'The data format is incorrect.' })

    const screenshot = await getScreenshot(title, new Date(date))

    response.setHeader('Content-Type', 'image/png')
    response.setHeader('Cache-Control', 's-maxage=1, stale-while-revalidate')

    return response
      .status(200)
      .end(screenshot)
  } catch (error) {
    if (error instanceof Error) return response.status(500).send({ message: error.message })
    else return response.status(500).send({ message: 'Internal Server Error' })
  }
}
