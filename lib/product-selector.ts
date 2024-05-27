import type { Choice } from "@johnlindquist/kit"

export async function chooseIde() {
  const ideFolders = (await readdir(home("AppData", "Roaming", "JetBrains"), { withFileTypes: true })).filter(
    (x) => x.isDirectory,
  )

  const choices = ideFolders.reduce(
    (agg, x) => {
      const parsed = /(.*?)([0-9.]+)/.exec(x.name)

      if (!parsed) {
        return agg
      }

      const [fullName, productName, version] = parsed

      if (!(productName && version)) {
        return agg
      }

      agg.push({
        name: x.name,
        value: { fullName, productName: productName, version: version, configPath: path.join(x.path, x.name) } as const,
      })
      return agg
    },
    [] as Choice<Readonly<{ fullName: string; productName: string; version: string; configPath: string }>>[],
  )

  return await arg({ placeholder: "Which IDE?" }, choices)
}
