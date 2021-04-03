import { VercelRequest, VercelResponse } from '@vercel/node'
import chromeLambda from 'chrome-aws-lambda'
import { promises as fs } from 'fs'
import path from 'path'
import puppeteer, {
  BrowserOptions,
  ChromeArgOptions,
  LaunchOptions
} from 'puppeteer-core'

const getLaunchOptions = async (): Promise<LaunchOptions & ChromeArgOptions & BrowserOptions> => process.env.AWS_REGION
  ? {
    executablePath: await chromeLambda.executablePath,
    args: chromeLambda.args,
    headless: chromeLambda.headless
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
  await page.evaluateHandle('document.fonts.ready')

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
    response.setHeader('Cache-Control', 'max-age=0, s-maxage=86400')

    return response
      .status(200)
      .end(screenshot)
  } catch (error) {
    if (error instanceof Error) return response.status(500).send({ message: error.message })
    else return response.status(500).send({ message: 'Internal Server Error' })
  }
}
