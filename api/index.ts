import puppeteer, { LaunchOptions } from 'puppeteer-core'
import chromeLambda from 'chrome-aws-lambda'
import { NowRequest, NowResponse } from '@now/node'
import path from 'path'
import { promises as fs } from 'fs'

const getLaunchOptions = async (): Promise<LaunchOptions> => process.env.IS_PRODUCUTION
  ? {
    executablePath: await chromeLambda.executablePath,
    headless: chromeLambda.headless,
    args: chromeLambda.args
  } : {
    executablePath: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  }

const getScreenshot = async (title: string): Promise<Buffer> => {
  const browser = await puppeteer.launch(await getLaunchOptions())
  const page = await browser.newPage()

  await page.setViewport({ width: 1280, height: 680 })
  await page.setContent((await fs.readFile(path.join(__dirname, '_static/template.html'), 'utf-8')).replace('(TITLE_TEXT)', title))

  return page.screenshot({ type: 'png' })
}

// eslint-disable-next-line
export default async function (request: NowRequest, response: NowResponse) {
  try {
    const { title } = request.query

    if (typeof title !== 'string') return response.status(400).send({ message: 'Require: title query' })

    const screenshot = await getScreenshot(title)

    response.setHeader('Content-Type', 'image/png')

    return response
      .status(200)
      .end(screenshot)
  } catch (error) {
    if (error instanceof Error) return response.status(500).send({ message: error.message })
    else return response.status(500).send({ message: 'Internal Server Error' })
  }
}
