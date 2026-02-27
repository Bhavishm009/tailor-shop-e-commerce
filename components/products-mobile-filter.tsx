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
  return (
    <div className="lg:hidden">
      <Drawer direction="bottom">
        <DrawerTrigger asChild>
          <Button className="w-full" type="button">
            Open Filters
          </Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Filter Products</DrawerTitle>
            <DrawerDescription>Set filters and apply from bottom sheet.</DrawerDescription>
          </DrawerHeader>
          <form action="/products" className="p-4 grid grid-cols-1 gap-3">
            <input name="q" defaultValue={props.q} placeholder="Search" className="h-10 rounded-md border bg-background px-3" />
            <select name="category" defaultValue={props.category} className="h-10 rounded-md border bg-background px-3">
              <option value="">All Categories</option>
              {props.categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <select name="material" defaultValue={props.material} className="h-10 rounded-md border bg-background px-3">
              <option value="">All Materials</option>
              {props.materials.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <select name="clothType" defaultValue={props.clothType} className="h-10 rounded-md border bg-background px-3">
              <option value="">All Cloth Types</option>
              {props.clothTypes.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <select name="color" defaultValue={props.color} className="h-10 rounded-md border bg-background px-3">
              <option value="">All Colors</option>
              {props.colors.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <select name="size" defaultValue={props.size} className="h-10 rounded-md border bg-background px-3">
              <option value="">All Sizes</option>
              {props.sizes.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input name="min" type="number" min="0" defaultValue={props.min} placeholder="Min Price" className="h-10 rounded-md border bg-background px-3" />
              <input name="max" type="number" min="0" defaultValue={props.max} placeholder="Max Price" className="h-10 rounded-md border bg-background px-3" />
            </div>
            <select name="sort" defaultValue={props.sort} className="h-10 rounded-md border bg-background px-3">
              <option value="newest">Newest</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="name_asc">Name: A-Z</option>
            </select>
            <DrawerFooter className="px-0">
              <Button type="submit">Apply Filters</Button>
              <DrawerClose asChild>
                <Button type="button" variant="outline">
                  Close
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
