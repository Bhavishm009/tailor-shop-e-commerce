"use client"

import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { useI18n } from "@/components/i18n-provider"
import { localizeCatalogLabel } from "@/lib/localize"

type Props = {
  q: string
  category: string
  material: string
  clothType: string
  color: string
  size: string
  min: string
  max: string
  sort: string
  categories: string[]
  materials: string[]
  clothTypes: string[]
  sizes: string[]
  colors: string[]
}

export function ProductsMobileFilter(props: Props) {
  const { dictionary, language } = useI18n()

  return (
    <div className="lg:hidden">
      <Drawer direction="bottom">
        <DrawerTrigger asChild>
          <Button className="w-full" type="button">
            {dictionary.common.filters}
          </Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Filter Products</DrawerTitle>
            <DrawerDescription>Set filters and apply from bottom sheet.</DrawerDescription>
          </DrawerHeader>
          <form action="/products" className="p-4 grid grid-cols-1 gap-3">
            <input name="q" defaultValue={props.q} placeholder={dictionary.productsPage.searchPlaceholder} className="h-10 rounded-md border bg-background px-3" />
            <select name="category" defaultValue={props.category} className="h-10 rounded-md border bg-background px-3">
              <option value="">{dictionary.common.allCategories}</option>
              {props.categories.map((item) => (
                <option key={item} value={item}>
                  {localizeCatalogLabel(item, language) || item}
                </option>
              ))}
            </select>
            <select name="material" defaultValue={props.material} className="h-10 rounded-md border bg-background px-3">
              <option value="">{dictionary.common.allMaterials}</option>
              {props.materials.map((item) => (
                <option key={item} value={item}>
                  {localizeCatalogLabel(item, language) || item}
                </option>
              ))}
            </select>
            <select name="clothType" defaultValue={props.clothType} className="h-10 rounded-md border bg-background px-3">
              <option value="">{dictionary.common.allClothTypes}</option>
              {props.clothTypes.map((item) => (
                <option key={item} value={item}>
                  {localizeCatalogLabel(item, language) || item}
                </option>
              ))}
            </select>
            <select name="color" defaultValue={props.color} className="h-10 rounded-md border bg-background px-3">
              <option value="">{dictionary.common.allColors}</option>
              {props.colors.map((item) => (
                <option key={item} value={item}>
                  {localizeCatalogLabel(item, language) || item}
                </option>
              ))}
            </select>
            <select name="size" defaultValue={props.size} className="h-10 rounded-md border bg-background px-3">
              <option value="">{dictionary.common.allSizes}</option>
              {props.sizes.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input name="min" type="number" min="0" defaultValue={props.min} placeholder={dictionary.productsPage.minPrice} className="h-10 rounded-md border bg-background px-3" />
              <input name="max" type="number" min="0" defaultValue={props.max} placeholder={dictionary.productsPage.maxPrice} className="h-10 rounded-md border bg-background px-3" />
            </div>
            <select name="sort" defaultValue={props.sort} className="h-10 rounded-md border bg-background px-3">
              <option value="newest">{dictionary.common.newest}</option>
              <option value="price_asc">{dictionary.common.priceLowToHigh}</option>
              <option value="price_desc">{dictionary.common.priceHighToLow}</option>
              <option value="name_asc">{dictionary.common.nameAZ}</option>
            </select>
            <DrawerFooter className="px-0">
              <Button type="submit">{dictionary.common.applyFilters}</Button>
              <DrawerClose asChild>
                <Button type="button" variant="outline">
                  {dictionary.common.close}
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
