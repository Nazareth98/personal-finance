import { useState, type FormEvent } from 'react';
import { Button, Checkbox, Dialog, Input, RadioGroup, Select, useToast } from '@personal-finance/ui';
import { validateTransactionDraft, type TransactionDraft, type TransactionErrors } from '../lib/transaction-validation';

const blank: TransactionDraft = {description:'',amount:'',kind:'expense',account:'',confirmedDemo:false};

export function TransactionDemoForm({open,onClose}:{open:boolean;onClose:()=>void}) {
  const [draft,setDraft] = useState<TransactionDraft>(blank);
  const [errors,setErrors] = useState<TransactionErrors>({});
  const {notify} = useToast();
  function patch<K extends keyof TransactionDraft>(key:K,value:TransactionDraft[K]){
    setDraft(current=>({...current,[key]:value}));
    setErrors(current=>({...current,[key]:undefined}));
  }
  function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    const nextErrors=validateTransactionDraft(draft);
    setErrors(nextErrors);
    if(Object.keys(nextErrors).length){
      notify({message:'Revise os campos destacados antes de continuar.',tone:'error'});
      return;
    }
    notify({message:'Formulário validado! Nenhuma movimentação foi gravada.',tone:'success'});
    setDraft(blank);setErrors({});onClose();
  }
  return <Dialog open={open} onClose={onClose} title="Nova movimentação — demonstração"
    description="Experimente os componentes. Este formulário não armazena ou envia dados.">
    <form onSubmit={submit} noValidate className="transaction-form">
      <Input label="Descrição" placeholder="Ex.: Mercado demonstrativo" value={draft.description}
        maxLength={121} required error={errors.description}
        onChange={e=>patch('description',e.target.value)}/>
      <Input label="Valor (R$)" inputMode="decimal" placeholder="123,45" value={draft.amount}
        required error={errors.amount} onChange={e=>patch('amount',e.target.value)}/>
      <RadioGroup legend="Tipo de movimentação" name="kind" value={draft.kind} required error={errors.kind}
        options={[{value:'income',label:'Receita'},{value:'expense',label:'Despesa'},{value:'transfer',label:'Transferência'}]}
        onChange={v=>patch('kind',v as TransactionDraft['kind'])}/>
      <Select label="Conta fictícia" required value={draft.account} error={errors.account}
        placeholder="Selecione a conta" options={[{value:'checking',label:'Conta corrente exemplo'},{value:'savings',label:'Poupança exemplo'}]}
        onChange={e=>patch('account',e.target.value)}/>
      <Checkbox label="Entendo que esta é apenas uma demonstração, sem gravação de dados."
        checked={draft.confirmedDemo} error={errors.confirmedDemo}
        onChange={e=>patch('confirmedDemo',e.target.checked)}/>
      <div className="transaction-form__actions">
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button type="submit">Validar demonstração</Button>
      </div>
    </form>
  </Dialog>;
}
