"use server";
import { signIn } from '@/auth';
import { AuthError } from 'next-auth';
import { sql } from "@vercel/postgres";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    await signIn('credentials', formData);
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials.';
        default:
          return 'Something went wrong.';
      }
    }
    throw error;
  }
}

const FormSchema = z.object({
  id: z.string(),
  customerId: z.string({
    invalid_type_error: 'Please select a customer.' //Zod уже выдает ошибку, если поле customer пусто, поскольку он ожидает ввода строки. Но давайте добавим дружественное сообщение, если пользователь не выберет клиента.
  }),
  amount: z.coerce
  .number() // библиотека проверяет и приобразовывает тип к числу
  .gt(0, { message: 'Please enter an amount greater than $0.' }),//Поскольку вы изменяете тип суммы со string на number, по умолчанию она будет равна нулю, если строка пуста. Давайте скажем Zod, что мы всегда хотим, чтобы сумма была больше 0 с помощью функции .gt().
  status: z.enum(["pending", "paid"], {
    invalid_type_error: 'Please select an invoice status.',//Zod уже выдает ошибку, если поле статуса пусто, поскольку в нем ожидается "ожидающий" или "оплаченный". Давайте также добавим дружественное сообщение, если пользователь не выберет статус.
  }),
  date: z.string(),
});

export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
}

const CreateInvoice = FormSchema.omit({ id: true, date: true });
const UpdateInvoice = FormSchema.omit({ id: true, date: true });

export async function createInvoice(prevState: State, formData: FormData) {
  const validatedFields = CreateInvoice.safeParse({//Функция safeParse() вернет объект, содержащий либо поле success, либо поле error. 
    //Это поможет более корректно обрабатывать проверку, не помещая эту логику в блок try/catch.
    customerId: formData.get("customerId"),
    amount: formData.get("amount"),
    status: formData.get("status"),
  });


  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Create Invoice.',
    };
  }

  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;
  const date = new Date().toISOString().split("T")[0];

  try {
    await sql`
  INSERT INTO invoices (customer_id, amount, status, date)
  VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
`;
  } catch (error) {
    return {
      massage: "Database Error: Failed to Create Invoice.",
    };
  }

  //После обновления базы данных путь /dashboard/invoices будет повторно проверен, и с сервера будут получены свежие данные.
  revalidatePath("/dashboard/invoices");
  redirect("/dashboard/invoices");
}

export async function updateInvoice(id: string,  prevState: State, formData: FormData) {
  const validatedFields = CreateInvoice.safeParse({
    customerId: formData.get("customerId"),
    amount: formData.get("amount"),
    status: formData.get("status"),
  })

  if(!validatedFields.success){
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Create Invoice.',
    }
  }
  
  const { customerId, amount, status } = validatedFields.data
  const amountInCents = amount * 100;

  try {
    await sql`
  UPDATE invoices
  SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
  WHERE id = ${id}
`;
  } catch (error) {
    return {
      massage: "Database Error: Failed to Update Invoice.",
    };
  }

  revalidatePath("/dashboard/invoices");
  redirect("/dashboard/invoices");
}

export async function deleteInvoice(id: string) {
  //нужно удалить для корректного удаления счета
  // throw new Error('Failed to Delete Invoice');
  try {
    await sql`DELETE FROM invoices WHERE id = ${id}`;
    revalidatePath("/dashboard/invoices");
    return { message: "Deleted Invoice." };
  } catch (error) {
    return { message: "Database Error: Failed to Delete Invoice." };
  }
}
