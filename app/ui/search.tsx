"use client";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";

import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

export default function Search({ placeholder }: { placeholder: string }) {
  const searchParams = useSearchParams(); //Позволяет вам получить доступ к ПАРАМЕТРАМ текущего URL-адреса.
  const pathname = usePathname(); //Позволяет вам прочитать путь к текущему URL-адресу.
  const { replace } = useRouter(); //Позволяет программно перемещаться между маршрутами в клиентских компонентах.

  const handleSearch = useDebouncedCallback((term: string) => {
    console.log(`Searching...${term}`);
    console.log(pathname); //визуализация текущего пути в консоли
    console.log(searchParams.toString()); //визуализация текущих параметров в консоли в консоли (посмотреть на сервере http://localhost:3000/dashboard/invoices)и ввести что нибудь в поисковую строку
    const params = new URLSearchParams(searchParams); //предоставляющий удобное API для формирования строки поисковых параметров, которую потом можно использовать для формирования полного адреса.
    params.set("page", "1");
    if (term) {
      params.set("query", term); // устанавливаем пареметр query=term, при вводу пользователем что то в инпут
    } else {
      params.delete("query");
    }
    replace(`${pathname}?${params.toString()}`); // replase -  заменит ссулку(URL) на "путь" далее "?" далее параметр "query".
    // Например: если ввести в поисковую строку "1" то URL будет такой http://localhost:3000/dashboard/invoices?query=1
  }, 400);

  return (
    <div className="relative flex flex-1 flex-shrink-0">
      <label htmlFor="search" className="sr-only">
        Search
      </label>
      <input
        className="peer block w-full rounded-md border border-gray-200 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-500"
        placeholder={placeholder}
        onChange={(e) => handleSearch(e.target.value)}
        defaultValue={searchParams.get("query")?.toString()}
      />
      <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
    </div>
  );
}
