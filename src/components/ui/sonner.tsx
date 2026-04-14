import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      toastOptions={{
        classNames: {
          toast: "sonner-toast",
          description: "sonner-description",
          actionButton: "sonner-action",
          cancelButton: "sonner-cancel",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
